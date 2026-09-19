'use client'

import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { createBrowserSpeechSynthesisPort, type SpeechSynthesisPort } from '@/lib/reader/speech/SpeechSynthesisPort'
import { selectVoice } from '@/lib/reader/speech/selectVoice'
import type { SpeechSegment, SpeechSettings, SpeechVoice } from '@/lib/reader/speech/types'

export const VOICE_DISCOVERY_TIMEOUT_MS = 3000
export type SpeechStatus = 'unsupported' | 'loadingVoices' | 'ready' | 'playing' | 'paused' | 'errorStopped' | 'completed'
export type NavigationSource = 'user' | 'speech' | 'restore'
export interface SpeechCursor { pageIndex: number; segmentIndex: number }
export interface UseSpeechSynthesisOptions {
  port?: SpeechSynthesisPort
  pages: readonly (readonly SpeechSegment[])[]
  language: string
  settings: SpeechSettings
  contextKey: string
  onNavigate(pageIndex: number, transitionToken: string): void
  onPlaybackStart?(): void
  /** An explicitly requested fallback has actually started in the browser. */
  onDefaultVoiceStart?(): void
}
export interface SpeechState {
  status: SpeechStatus
  cursor: SpeechCursor
  voices: SpeechVoice[]
  voiceStatus: 'loading' | 'available' | 'unavailable' | 'unsupported'
  error: string | null
  generation: number
  charIndex: number
}
type Selection = ReturnType<typeof selectVoice>
type Transition = { pageIndex: number; token: string; generation: number; continuation: number; initial: boolean; confirmed: boolean }

/** Event-driven controller, exported so deterministic tests exercise the production state machine. */
export class SpeechSynthesisController {
  private options: UseSpeechSynthesisOptions
  private readonly port: SpeechSynthesisPort
  private state: SpeechState = {
    status: 'loadingVoices', cursor: { pageIndex: 0, segmentIndex: 0 },
    voices: [], voiceStatus: 'loading', error: null, generation: 0, charIndex: 0,
  }
  private listeners = new Set<() => void>()
  private mounted = false
  private unsubscribeVoices?: () => void
  private voiceTimer?: ReturnType<typeof setTimeout>
  private sequence = 0
  private continuation: number | null = null
  private utteranceToken: number | null = null
  private expected: Transition | null = null
  private activeVoiceURI: string | undefined
  private voiceDisappeared = false
  private uaDefaultSession = false
  private uaDefaultTrial = false
  private retryCursor = false
  private pausedAdvance = false
  private startOffset = 0

  constructor(options: UseSpeechSynthesisOptions, port: SpeechSynthesisPort) {
    this.options = options
    this.port = port
  }
  getSnapshot = (): SpeechState => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(patch: Partial<SpeechState>) {
    this.state = { ...this.state, ...patch }
    if (this.mounted) this.listeners.forEach(listener => listener())
  }
  getSelection = (): Selection => {
    const { settings, language } = this.options
    const base = language.toLowerCase().split('-')[0]
    return selectVoice(this.state.voices, language,
      settings.voiceByLanguage[language] ?? settings.voiceByLanguage[base],
      settings.allowRemoteVoiceByLanguage[language] ?? settings.allowRemoteVoiceByLanguage[base] ?? false)
  }
  private clearVoiceTimer() {
    if (this.voiceTimer !== undefined) clearTimeout(this.voiceTimer)
    this.voiceTimer = undefined
  }
  private readVoices = () => {
    if (!this.mounted) return
    const voices = this.port.getVoices()
    if (this.activeVoiceURI && !voices.some(voice => voice.voiceURI === this.activeVoiceURI)) this.voiceDisappeared = true
    if (voices.length) this.clearVoiceTimer()
    const voiceStatus = voices.length ? 'available' : this.state.voiceStatus === 'unavailable' ? 'unavailable' : 'loading'
    const idle = this.state.status === 'loadingVoices' || this.state.status === 'unsupported'
    this.publish({ voices, voiceStatus, ...(idle && voices.length ? { status: 'ready' as const } : {}) })
    if (!voices.length && this.voiceTimer === undefined && voiceStatus === 'loading') {
      this.voiceTimer = setTimeout(() => {
        this.voiceTimer = undefined
        if (!this.mounted) return
        const latest = this.port.getVoices()
        if (latest.length) { this.readVoices(); return }
        this.publish({ voiceStatus: 'unavailable', ...(this.state.status === 'loadingVoices' ? { status: 'ready' as const } : {}) })
      }, VOICE_DISCOVERY_TIMEOUT_MS)
    }
  }
  mount = () => {
    if (this.mounted) return
    this.mounted = true
    if (!this.port.isSupported()) {
      this.publish({ status: 'unsupported', voiceStatus: 'unsupported' })
      return
    }
    this.unsubscribeVoices = this.port.onVoicesChanged(this.readVoices)
    this.readVoices()
  }
  dispose = () => {
    this.mounted = false
    this.unsubscribeVoices?.()
    this.unsubscribeVoices = undefined
    this.clearVoiceTimer()
    this.invalidate()
    this.state = { ...this.state, status: this.state.voiceStatus === 'loading' ? 'loadingVoices' : 'ready' }
  }
  updateOptions = (options: UseSpeechSynthesisOptions) => {
    const previous = this.options
    this.options = options
    const contextChanged = previous.contextKey !== options.contextKey || previous.language !== options.language || previous.pages !== options.pages
    // Remembering the default voice already in use does not select a different
    // voice or replace this session. Explicit listed-voice changes still stop it.
    const remembersActiveDefault = this.uaDefaultSession && this.continuation !== null && this.getSelection().mode === 'ua-default'
    const voiceChanged = (!remembersActiveDefault && JSON.stringify(previous.settings.voiceByLanguage) !== JSON.stringify(options.settings.voiceByLanguage)) ||
      JSON.stringify(previous.settings.allowRemoteVoiceByLanguage) !== JSON.stringify(options.settings.allowRemoteVoiceByLanguage)
    if (contextChanged) this.stop(0)
    else if (voiceChanged || previous.settings.rate !== options.settings.rate) {
      this.invalidate()
      this.retryCursor = true
      this.publish({ status: 'ready', error: null })
    }
  }
  private invalidate() {
    this.continuation = null
    this.utteranceToken = null
    this.expected = null
    this.activeVoiceURI = undefined
    this.voiceDisappeared = false
    this.pausedAdvance = false
    this.uaDefaultTrial = false
    // Increment before cancel: some implementations synchronously emit cancellation events.
    this.state = { ...this.state, generation: this.state.generation + 1 }
    this.port.cancel()
  }
  private valid(generation: number, continuation: number) {
    return this.mounted && generation === this.state.generation && continuation === this.continuation
  }
  private finish() {
    this.continuation = null
    this.expected = null
    this.utteranceToken = null
    this.activeVoiceURI = undefined
    this.retryCursor = false
    this.publish({ status: 'completed', error: null })
  }
  private fail(code: string) {
    this.invalidate()
    this.retryCursor = true
    this.publish({ status: 'errorStopped', error: code })
  }
  private nextNonempty(from: number): number | null {
    for (let page = from; page < this.options.pages.length; page++) {
      if (this.options.pages[page].length) return page
      if (!this.options.settings.continueAcrossPages) break
    }
    return null
  }
  /** Call directly from the play button event handler, never from an effect. */
  start = (pageIndex: number, options: { uaDefault?: boolean; cursor?: { segmentIndex: number; charIndex: number } } = {}) => {
    if (!this.mounted || !this.port.isSupported()) return
    if (this.state.status === 'paused') { this.resume(); return }
    if (this.state.status === 'playing') return
    if (options.uaDefault && this.state.voiceStatus !== 'unavailable') return
    const selection = this.getSelection()
    const uaDefault = options.uaDefault === true || selection.mode === 'ua-default'
    if (uaDefault && this.state.voiceStatus === 'loading') return
    if (!uaDefault && selection.mode !== 'listed') return
    const cursor = this.retryCursor && !options.cursor ? this.state.cursor :
      { pageIndex: Math.max(0, pageIndex), segmentIndex: options.cursor?.segmentIndex ?? 0 }
    this.invalidate()
    // cancel() and speak() preserve native paused state. Clear it in this user gesture.
    this.port.resume()
    this.uaDefaultSession = uaDefault
    this.uaDefaultTrial = options.uaDefault === true
    this.startOffset = Math.max(0, Math.min((this.options.pages[cursor.pageIndex]?.[cursor.segmentIndex]?.text.length ?? 1) - 1,
      Math.floor(options.cursor?.charIndex ?? 0)))
    this.retryCursor = false
    this.continuation = ++this.sequence
    this.options.onPlaybackStart?.()
    this.publish({ cursor, status: 'playing', error: null })
    const firstPage = this.nextNonempty(cursor.pageIndex)
    if (firstPage === null) { this.finish(); return }
    const generation = this.state.generation
    const continuation = this.continuation
    if (firstPage !== cursor.pageIndex) {
      // Resolve empty pages within this user gesture so the first speak retains activation.
      this.publish({ cursor: { pageIndex: firstPage, segmentIndex: 0 } })
      this.requestPage(firstPage, generation, continuation, true)
    }
    if (this.valid(generation, continuation)) this.speakCurrent(generation, continuation)
  }
  private speakCurrent(generation: number, continuation: number) {
    if (!this.valid(generation, continuation)) return
    const { pageIndex, segmentIndex } = this.state.cursor
    const segment = this.options.pages[pageIndex]?.[segmentIndex]
    if (!segment) { this.finish(); return }
    const selected = this.getSelection()
    if (!this.uaDefaultSession && selected.mode !== 'listed') { this.fail('voice-unavailable'); return }
    // Embedded language may use another local voice; never auto-select a remote voice.
    const embedded = selectVoice(this.state.voices, segment.lang)
    const voice = this.uaDefaultSession ? undefined :
      segment.lang.toLowerCase().split('-')[0] !== this.options.language.toLowerCase().split('-')[0] && embedded.mode === 'listed'
        ? embedded.voice : selected.voice
    this.activeVoiceURI = voice?.voiceURI
    this.voiceDisappeared = false
    const utteranceToken = ++this.sequence
    this.utteranceToken = utteranceToken
    const current = () => this.valid(generation, continuation) && this.utteranceToken === utteranceToken
    const startOffset = this.startOffset
    this.startOffset = 0
    this.publish({ charIndex: startOffset })
    try {
      this.port.speak({ text: segment.text.slice(startOffset), lang: voice?.lang ?? segment.lang, rate: this.options.settings.rate, voiceURI: voice?.voiceURI }, {
        onStart: () => {
          if (!current()) return
          if (this.state.status !== 'paused') this.publish({ status: 'playing' })
          if (this.uaDefaultTrial) {
            this.uaDefaultTrial = false
            this.options.onDefaultVoiceStart?.()
          }
        },
        onBoundary: charIndex => {
          if (current()) this.publish({ charIndex: startOffset + charIndex })
        },
        onEnd: () => {
          if (!current()) return
          this.utteranceToken = null
          if (this.voiceDisappeared) { this.fail('voice-unavailable'); return }
          if (this.state.status === 'paused') { this.pausedAdvance = true; return }
          this.advance(generation, continuation)
        },
        onError: code => { if (current()) this.fail(code) },
      })
    } catch { if (current()) this.fail('synthesis-failed') }
  }
  private advance(generation: number, continuation: number) {
    if (!this.valid(generation, continuation)) return
    const { pageIndex, segmentIndex } = this.state.cursor
    if (segmentIndex + 1 < this.options.pages[pageIndex].length) {
      this.publish({ cursor: { pageIndex, segmentIndex: segmentIndex + 1 } })
      this.speakCurrent(generation, continuation)
      return
    }
    if (!this.options.settings.continueAcrossPages) { this.finish(); return }
    const nextPage = this.nextNonempty(pageIndex + 1)
    if (nextPage === null) { this.finish(); return }
    this.requestPage(nextPage, generation, continuation, false)
  }
  private requestPage(pageIndex: number, generation: number, continuation: number, initial: boolean) {
    const token = `${generation}:${++this.sequence}`
    this.expected = { pageIndex, token, generation, continuation, initial, confirmed: false }
    this.options.onNavigate(pageIndex, token)
  }
  notifyNavigation = (pageIndex: number, source: NavigationSource, token?: string): boolean => {
    if (source === 'speech') {
      const expected = this.expected
      return !!expected && expected.pageIndex === pageIndex && expected.token === token && this.valid(expected.generation, expected.continuation)
    }
    this.stop(pageIndex)
    return true
  }
  /** Only a committed speech navigation with the issued token can continue playback. */
  confirmPage = (pageIndex: number, token: string): boolean => {
    const expected = this.expected
    if (!expected || expected.confirmed || !this.notifyNavigation(pageIndex, 'speech', token)) return false
    expected.confirmed = true
    if (expected.initial) { this.expected = null; return true }
    this.publish({ cursor: { pageIndex, segmentIndex: 0 } })
    if (this.state.status === 'paused') return true
    this.expected = null
    this.speakCurrent(expected.generation, expected.continuation)
    return true
  }
  /** A user-selected rendered segment replaces the utterance, keeping the session voice. */
  seek = (pageIndex: number, segmentIndex: number, charIndex = 0) => {
    if (this.state.status !== 'playing' && this.state.status !== 'paused') return false
    const segment = this.options.pages[pageIndex]?.[segmentIndex]
    if (!segment) return false
    this.invalidate()
    this.port.resume()
    this.retryCursor = false
    this.continuation = ++this.sequence
    this.startOffset = Math.max(0, Math.min(segment.text.length - 1, Math.floor(charIndex)))
    this.options.onPlaybackStart?.()
    this.publish({ cursor: { pageIndex, segmentIndex }, status: 'playing', error: null })
    this.speakCurrent(this.state.generation, this.continuation)
    return true
  }
  pause = () => {
    if (this.state.status !== 'playing') return
    this.publish({ status: 'paused' })
    this.port.pause()
  }
  resume = () => {
    if (this.state.status !== 'paused' || this.continuation === null) return
    const generation = this.state.generation
    const continuation = this.continuation
    this.options.onPlaybackStart?.()
    this.publish({ status: 'playing' })
    this.port.resume()
    if (this.expected?.confirmed) {
      this.expected = null
      this.speakCurrent(generation, continuation)
    } else if (this.pausedAdvance) {
      this.pausedAdvance = false
      this.advance(generation, continuation)
    }
  }
  stop = (pageIndex = this.state.cursor.pageIndex) => {
    this.invalidate()
    this.retryCursor = false
    this.publish({ status: this.state.voiceStatus === 'unsupported' ? 'unsupported' : this.state.voiceStatus === 'loading' ? 'loadingVoices' : 'ready',
      cursor: { pageIndex, segmentIndex: 0 }, error: null })
  }
  reconcileVisibility = (visible: boolean) => {
    if (!visible || !this.mounted) return
    const native = this.port.getStatus()
    if (this.state.status === 'playing' && !native.speaking && !native.pending) {
      this.invalidate()
      this.retryCursor = true
      this.publish({ status: 'ready', error: null })
    }
  }
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions) {
  const port = useMemo(() => options.port ?? createBrowserSpeechSynthesisPort(), [options.port])
  const controller = useMemo(() => new SpeechSynthesisController(options, port), [port])
  useLayoutEffect(() => { controller.updateOptions(options) })
  useEffect(() => {
    controller.mount()
    const visibility = () => controller.reconcileVisibility(document.visibilityState === 'visible')
    const pagehide = () => controller.stop()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', pagehide)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', pagehide)
      controller.dispose()
    }
  }, [controller])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  return {
    state, ...state, selection: controller.getSelection(),
    start: controller.start, pause: controller.pause, resume: controller.resume, stop: controller.stop, seek: controller.seek,
    notifyNavigation: controller.notifyNavigation, confirmPage: controller.confirmPage,
  }
}
