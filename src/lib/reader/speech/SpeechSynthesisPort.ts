import type { SpeechVoice } from './types'

export interface SpeechRequest {
  text: string
  lang: string
  rate: number
  voiceURI?: string
}

export interface SpeechEvents {
  onBoundary?(charIndex: number): void
  onStart(): void
  onEnd(): void
  onError(code: string): void
}

export interface SpeechSynthesisPort {
  isSupported(): boolean
  getVoices(): SpeechVoice[]
  getStatus(): { speaking: boolean; pending: boolean; paused: boolean }
  onVoicesChanged(listener: () => void): () => void
  speak(request: SpeechRequest, events: SpeechEvents): void
  pause(): void
  resume(): void
  cancel(): void
}

/** This adapter alone owns native utterances; no native object crosses the port. */
export function createBrowserSpeechSynthesisPort(): SpeechSynthesisPort {
  const supported = () => typeof window !== 'undefined' &&
    'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
  let active: SpeechSynthesisUtterance | null = null
  const release = () => {
    if (!active) return
    active.onstart = null
    active.onend = null
    active.onerror = null
    active.onboundary = null
    active = null
  }
  return {
    isSupported: supported,
    getVoices: () => supported() ? window.speechSynthesis.getVoices().map(voice => ({
      voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang,
      localService: voice.localService, default: voice.default,
    })) : [],
    getStatus: () => supported() ? {
      speaking: window.speechSynthesis.speaking,
      pending: window.speechSynthesis.pending,
      paused: window.speechSynthesis.paused,
    } : { speaking: false, pending: false, paused: false },
    onVoicesChanged(listener) {
      if (!supported()) return () => {}
      window.speechSynthesis.addEventListener('voiceschanged', listener)
      return () => window.speechSynthesis.removeEventListener('voiceschanged', listener)
    },
    speak(request, events) {
      if (!supported()) { events.onError('synthesis-unavailable'); return }
      const utterance = new window.SpeechSynthesisUtterance(request.text)
      utterance.lang = request.lang
      utterance.rate = request.rate
      utterance.voice = request.voiceURI
        ? window.speechSynthesis.getVoices().find(voice => voice.voiceURI === request.voiceURI) ?? null
        : null
      // Never silently substitute a missing explicitly selected voice with a remote default.
      if (request.voiceURI && !utterance.voice) { events.onError('voice-unavailable'); return }
      active = utterance
      let started = false
      utterance.onstart = () => {
        if (active !== utterance) return
        started = true
        events.onStart()
      }
      utterance.onboundary = event => { if (active === utterance) events.onBoundary?.(event.charIndex) }
      utterance.onend = () => {
        if (active !== utterance) return
        release()
        if (started) events.onEnd()
        else events.onError('synthesis-failed')
      }
      utterance.onerror = event => {
        if (active !== utterance) return
        release()
        events.onError(event.error)
      }
      try { window.speechSynthesis.speak(utterance) }
      catch { release(); events.onError('synthesis-failed') }
    },
    pause: () => { if (supported()) window.speechSynthesis.pause() },
    resume: () => { if (supported()) window.speechSynthesis.resume() },
    cancel() {
      release()
      if (supported()) window.speechSynthesis.cancel()
    },
  }
}
