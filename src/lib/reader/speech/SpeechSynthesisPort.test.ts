import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrowserSpeechSynthesisPort } from './SpeechSynthesisPort'

afterEach(() => vi.unstubAllGlobals())

function setup() {
  class Utterance {
    lang = ''
    rate = 1
    voice: unknown = null
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: ((event: { error: string }) => void) | null = null
    constructor(public text: string) {}
  }
  const voice = { voiceURI: 'ja', name: 'Japanese', lang: 'ja-JP', default: true, localService: true }
  const synth = {
    speaking: false, pending: false, paused: false,
    getVoices: vi.fn(() => [voice]),
    speak: vi.fn<(utterance: Utterance) => void>(),
    pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }
  // This is a unit-level stand-in for the whole browser scope, not a native-property patch.
  vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance })
  const port = createBrowserSpeechSynthesisPort()
  const events = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
  return { port, synth, events, voice }
}

describe('browser speech adapter', () => {
  it('is safe without a browser and exposes only plain voice metadata', () => {
    vi.stubGlobal('window', undefined)
    const port = createBrowserSpeechSynthesisPort()
    expect(port.isSupported()).toBe(false)
    expect(port.getVoices()).toEqual([])
    expect(port.getStatus()).toEqual({ speaking: false, pending: false, paused: false })
    expect(() => port.cancel()).not.toThrow()
  })
  it.each([1.3, 10])('maps rate %s and clears native handlers at completion', (rate) => {
    const { port, synth, events, voice } = setup()
    port.speak({ text: '本文', lang: 'ja-JP', rate, voiceURI: 'ja' }, events)
    const utterance = synth.speak.mock.calls[0][0]
    expect(utterance.text).toBe('本文')
    expect(utterance.voice).toBe(voice)
    expect(utterance.rate).toBe(rate)
    utterance.onstart?.()
    utterance.onend?.()
    expect(events.onStart).toHaveBeenCalledOnce()
    expect(events.onEnd).toHaveBeenCalledOnce()
    expect(utterance.onstart).toBeNull()
    expect(utterance.onend).toBeNull()
    expect(utterance.onerror).toBeNull()
  })
  it('maps explicit UA default to voice null and refuses missing listed voices', () => {
    const { port, synth, events } = setup()
    port.speak({ text: '本文', lang: 'ja-JP', rate: 1 }, events)
    expect(synth.speak.mock.calls[0][0].voice).toBeNull()
    port.cancel()
    port.speak({ text: '本文', lang: 'ja-JP', rate: 1, voiceURI: 'missing' }, events)
    expect(events.onError).toHaveBeenCalledWith('voice-unavailable')
    expect(synth.speak).toHaveBeenCalledOnce()
  })
  it('detaches cancel handlers before native cancel and ignores captured late events', () => {
    const { port, synth, events } = setup()
    port.speak({ text: '本文', lang: 'ja-JP', rate: 1 }, events)
    const utterance = synth.speak.mock.calls[0][0]
    const end = utterance.onend
    const error = utterance.onerror
    synth.cancel.mockImplementation(() => { expect(utterance.onerror).toBeNull() })
    port.cancel()
    end?.()
    error?.({ error: 'interrupted' })
    expect(events.onEnd).not.toHaveBeenCalled()
    expect(events.onError).not.toHaveBeenCalled()
  })
  it('uses subscription APIs and releases them without replacing global handlers', () => {
    const { port, synth } = setup()
    const listener = vi.fn()
    const dispose = port.onVoicesChanged(listener)
    expect(synth.addEventListener).toHaveBeenCalledWith('voiceschanged', listener)
    dispose()
    expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', listener)
  })
  it('reports synchronous synthesis errors without leaking native objects', () => {
    const { port, synth, events } = setup()
    synth.speak.mockImplementation(() => { throw new Error('native failure') })
    port.speak({ text: '本文', lang: 'ja-JP', rate: 1 }, events)
    expect(events.onError).toHaveBeenCalledWith('synthesis-failed')
    expect(synth.speak.mock.calls[0][0].onend).toBeNull()
  })
})

it('reports end without a native start as failure and releases the utterance once', () => {
  const { port, synth, events } = setup()
  port.speak({ text: '本文', lang: 'ja-JP', rate: 4 }, events)
  const utterance = synth.speak.mock.calls[0][0]
  const end = utterance.onend
  end?.()
  end?.()
  expect(events.onStart).not.toHaveBeenCalled()
  expect(events.onEnd).not.toHaveBeenCalled()
  expect(events.onError).toHaveBeenCalledExactlyOnceWith('synthesis-failed')
  expect(utterance.onstart).toBeNull()
  expect(utterance.onend).toBeNull()
  expect(utterance.onerror).toBeNull()
})
