import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { translations } from '@/lib/i18n/translations'
import { SpeechControls, type SpeechControlsProps } from './SpeechControls'

const voice = { voiceURI: 'en', name: 'English', lang: 'en-US', localService: true, default: true }
let root: Root
let container: HTMLDivElement

const defaults: SpeechControlsProps = {
  t: translations.en,
  state: 'ready',
  voiceListState: 'available',
  voices: [voice],
  selectedVoiceURI: voice.voiceURI,
  selectedVoiceMode: 'listed',
  allowRemoteVoice: false,
  rate: 1,
  continueAcrossPages: true,
  canTryDefaultVoice: false,
  onStart: () => {}, onPause: () => {}, onResume: () => {}, onStop: () => {},
  onRateChange: () => {}, onContinueAcrossPagesChange: () => {}, onRemoteVoiceConsentChange: () => {},
  onVoiceChange: () => {}, onTryDefaultVoice: () => {},
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

async function render(props: Partial<SpeechControlsProps> = {}) {
  await act(async () => root.render(createElement(SpeechControls, { ...defaults, ...props })))
}

describe('SpeechControls', () => {
  it.each(['ready', 'playing', 'paused'] as const)('shows the next playback action in %s state', async (state) => {
    const onStart = vi.fn()
    const onPause = vi.fn()
    const onResume = vi.fn()
    await render({ compact: true, state, onStart, onPause, onResume })
    const buttons = container.querySelectorAll<HTMLButtonElement>('button')
    const play = buttons[0]
    const label = state === 'playing' ? translations.en.reader.speech.pause
      : state === 'paused' ? translations.en.reader.speech.resume : translations.en.reader.speech.play
    expect(play.querySelector('[aria-hidden="true"]')?.textContent).toBe(state === 'playing' ? 'Ⅱ' : '▶')
    expect(play.title).toBe(label)
    expect(buttons[1].title).toBe(translations.en.reader.speech.stop)
    expect(buttons).toHaveLength(2)
    expect(container.querySelector('details, [role=dialog]')).toBeNull()
    expect(container.querySelector('[role=status]')?.className).toBe('sr-only')
    await act(async () => play.click())
    expect(onStart).toHaveBeenCalledTimes(state === 'ready' ? 1 : 0)
    expect(onPause).toHaveBeenCalledTimes(state === 'playing' ? 1 : 0)
    expect(onResume).toHaveBeenCalledTimes(state === 'paused' ? 1 : 0)
  })

  it('does not offer browser default voice in the normal voice selector', async () => {
    await render()
    expect(container.querySelector('option[value="ua-default"]')).toBeNull()
  })

  it('shows recovery guidance in the full controls only', async () => {
    await render({ voiceListState: 'no-matching', voices: [], selectedVoiceMode: 'unavailable' })
    expect(container.textContent).toContain(translations.en.reader.speech.voiceSetupHelp)
    await render({ compact: true, voiceListState: 'no-matching', voices: [], selectedVoiceMode: 'unavailable' })
    expect(container.textContent).not.toContain(translations.en.reader.speech.voiceSetupHelp)
  })

  it('provides no-matching recovery guidance in both supported UI languages', () => {
    expect(translations.en.reader.speech.voiceSetupHelp).toContain('Apple')
    expect(translations.ja.reader.speech.voiceSetupHelp).toContain('Android')
  })

  it.each<[string, Partial<SpeechControlsProps>, string]>([
    ['saved-voice fallback', { isFallback: true }, translations.en.reader.speech.fallbackVoice],
    ['UA-default fallback', { voiceListState: 'unavailable', voices: [], selectedVoiceURI: undefined, selectedVoiceMode: 'ua-default', canTryDefaultVoice: true }, translations.en.reader.speech.defaultVoiceNotice],
  ])('keeps %s detail out of the compact header', async (_name, props, detail) => {
    await render({ compact: true, ...props })
    expect(container.textContent).not.toContain(detail)
    await render({ ...props })
    expect(container.textContent).toContain(detail)
  })
})
