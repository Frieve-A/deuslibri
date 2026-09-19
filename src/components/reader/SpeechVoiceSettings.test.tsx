import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/lib/i18n/translations'
import { FakeSpeechSynthesisPort } from '@/lib/reader/speech/FakeSpeechSynthesisPort'
import { selectVoice } from '@/lib/reader/speech/selectVoice'
import { DEFAULT_SPEECH_SETTINGS, type SpeechSettings } from '@/lib/reader/speech/types'
import { SpeechVoiceSettings } from './SpeechVoiceSettings'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('SpeechVoiceSettings', () => {
  it('requires consent for a remote voice and saves English and Japanese choices independently', async () => {
    const port = new FakeSpeechSynthesisPort()
    port.voices = [
      { voiceURI: 'remote-en', name: 'Remote English', lang: 'en-US', localService: false, default: true },
      { voiceURI: 'local-ja', name: 'Local Japanese', lang: 'ja-JP', localService: true, default: true },
    ]
    let settings: SpeechSettings = {
      ...DEFAULT_SPEECH_SETTINGS,
      voiceByLanguage: {},
      allowRemoteVoiceByLanguage: {},
    }
    const onChange = (next: SpeechSettings) => { settings = next }
    const render = async () => act(async () => root.render(createElement(SpeechVoiceSettings, {
      t: translations.en, settings, onChange, port,
    })))

    await render()
    const english = container.querySelector<HTMLSelectElement>('#speechVoice-en')!
    expect(english.querySelector<HTMLOptionElement>('option[value="remote-en"]')?.disabled).toBe(true)
    await act(async () => {
      english.value = 'remote-en'
      english.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(settings.voiceByLanguage.en).toBeUndefined()
    expect(selectVoice(port.voices, 'en', settings.voiceByLanguage.en, false).mode).toBe('unavailable')

    await act(async () => container.querySelector<HTMLInputElement>('#allowRemoteVoice-en')!.click())
    await render()
    const enabledEnglish = container.querySelector<HTMLSelectElement>('#speechVoice-en')!
    expect(enabledEnglish.querySelector<HTMLOptionElement>('option[value="remote-en"]')?.disabled).toBe(false)
    await act(async () => {
      enabledEnglish.value = 'remote-en'
      enabledEnglish.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(selectVoice(port.voices, 'en', settings.voiceByLanguage.en, true)).toMatchObject({
      mode: 'listed', voice: { voiceURI: 'remote-en' }, isFallback: false,
    })

    await render()
    const japanese = container.querySelector<HTMLSelectElement>('#speechVoice-ja')!
    await act(async () => {
      japanese.value = 'local-ja'
      japanese.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(settings.voiceByLanguage).toMatchObject({
      en: { voiceURI: 'remote-en', lang: 'en-US' },
      ja: { voiceURI: 'local-ja', lang: 'ja-JP' },
    })
    expect(settings.allowRemoteVoiceByLanguage).toEqual({ en: true })
  })

  it('waits for delayed voices and removes its listener on cleanup', async () => {
    vi.useFakeTimers()
    const port = new FakeSpeechSynthesisPort()
    await act(async () => root.render(createElement(SpeechVoiceSettings, {
      t: translations.en,
      settings: DEFAULT_SPEECH_SETTINGS,
      onChange: () => {},
      port,
    })))
    expect(container.textContent).toContain(translations.en.reader.speech.loadingVoices)
    expect(port.listeners.size).toBe(1)

    port.voices = [
      { voiceURI: 'late', name: 'Late voice', lang: 'en-US', localService: true, default: true },
    ]
    await act(async () => vi.advanceTimersByTime(3000))
    expect(container.querySelector('option[value="late"]')).not.toBeNull()

    await act(async () => root.unmount())
    expect(port.listeners.size).toBe(0)
    root = createRoot(container)
  })

  it('reports unsupported synthesis without subscribing for voices', async () => {
    const port = new FakeSpeechSynthesisPort()
    port.supported = false
    await act(async () => root.render(createElement(SpeechVoiceSettings, {
      t: translations.en,
      settings: DEFAULT_SPEECH_SETTINGS,
      onChange: () => {},
      port,
    })))
    expect(container.textContent).toContain(translations.en.reader.speech.unsupported)
    expect(port.listeners.size).toBe(0)
  })
})
