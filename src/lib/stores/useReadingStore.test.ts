import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeSpeechSettings as normalizeReaderSpeechSettings } from '@/lib/reader/speech/types'
import { DEFAULT_SPEECH_SETTINGS, SPEECH_RATE_MAX, SPEECH_RATE_MIN, useReadingStore } from './useReadingStore'

const STORAGE_KEY = 'deuslibri-reading-storage'

function resetStore() {
  localStorage.clear()
  useReadingStore.setState(useReadingStore.getInitialState(), true)
}

function persistState(state: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }))
  return useReadingStore.persist.rehydrate()
}

describe('reading store speech setting migration', () => {
  beforeEach(resetStore)

  it('uses the shared normalizer contract for trimmed voices and malformed listed selections', () => {
    expect(normalizeReaderSpeechSettings({
      rate: Number.NaN,
      voiceByLanguage: {
        ' JA ': { mode: 'listed', voiceURI: ' voice-ja ', name: ' Japanese ', lang: ' ja-JP ' },
        en: { mode: 'listed', lang: 'en-US' },
        de: { mode: 'listed', voiceURI: '   ', lang: 'de-DE' },
      },
      allowRemoteVoiceByLanguage: { ' JA ': true, en: false, de: 'yes' },
    })).toEqual({
      rate: 1.5,
      continueAcrossPages: true,
      voiceByLanguage: {
        ja: { mode: 'listed', voiceURI: 'voice-ja', name: 'Japanese', lang: 'ja-JP' },
      },
      allowRemoteVoiceByLanguage: { ja: true, en: false },
    })
  })

  it('hydrates old settings without speech while preserving old and nested settings', async () => {
    await persistState({
      settings: {
        writingMode: 'vertical',
        theme: 'sepia',
        fontSize: 22,
        autoScroll: { speed: 17 },
        interaction: { enableTapScroll: false },
      },
    })

    const settings = useReadingStore.getState().settings
    expect(settings).toMatchObject({
      writingMode: 'vertical',
      theme: 'sepia',
      fontSize: 22,
      autoScroll: { speed: 17, enabled: false },
      interaction: { enableTapScroll: false, enableTapPageTurn: true },
    })
    expect(settings.speech).toEqual(DEFAULT_SPEECH_SETTINGS)
  })

  it('hydrates partial speech through the reader normalizer contract', async () => {
    localStorage.setItem(STORAGE_KEY, `{"state":{"settings":{"fontFamily":"serif","speech":{"rate":1e999,"continueAcrossPages":false,"voiceByLanguage":{" JA ":{"mode":"listed","voiceURI":" voice-ja ","name":" Japanese ","lang":" ja-JP ","localService":true},"en":{"mode":"listed","lang":"en-US"},"fr":{"mode":"invalid","voiceURI":"fr","lang":"fr-FR"}},"allowRemoteVoiceByLanguage":{" JA ":true,"en":false,"fr":"yes"}}}},"version":0}`)
    await useReadingStore.persist.rehydrate()

    const settings = useReadingStore.getState().settings
    expect(settings.fontFamily).toBe('serif')
    expect(settings.speech).toEqual(normalizeReaderSpeechSettings({
      rate: Infinity,
      continueAcrossPages: false,
      voiceByLanguage: {
        ' JA ': { mode: 'listed', voiceURI: ' voice-ja ', name: ' Japanese ', lang: ' ja-JP ', localService: true },
        en: { mode: 'listed', lang: 'en-US' },
        fr: { mode: 'invalid', voiceURI: 'fr', lang: 'fr-FR' },
      },
      allowRemoteVoiceByLanguage: { ' JA ': true, en: false, fr: 'yes' },
    }))
    expect(settings.speech.rate).toBe(1.5)
    expect(settings.speech.voiceByLanguage).toEqual({
      ja: { mode: 'listed', voiceURI: 'voice-ja', name: 'Japanese', lang: 'ja-JP', localService: true },
    })
    expect(settings.speech.allowRemoteVoiceByLanguage).toEqual({ ja: true, en: false })
  })

  it('restores an exported empty speech selection exactly over later state', () => {
    useReadingStore.getState().updateSettings({
      speech: {
        rate: 0.8,
        continueAcrossPages: false,
        voiceByLanguage: {},
        allowRemoteVoiceByLanguage: {},
      },
    })
    const exported = useReadingStore.getState().exportData()

    useReadingStore.getState().updateSettings({
      speech: {
        rate: 1.7,
        continueAcrossPages: true,
        voiceByLanguage: {
          ja: { mode: 'listed', voiceURI: 'later-ja', lang: 'ja-JP' },
        },
        allowRemoteVoiceByLanguage: { ja: true },
      },
    })
    useReadingStore.getState().importData(exported)

    expect(useReadingStore.getState().settings.speech).toEqual({
      rate: 0.8,
      continueAcrossPages: false,
      voiceByLanguage: {},
      allowRemoteVoiceByLanguage: {},
    })
  })

  it('fills default speech when importing an old export without speech', () => {
    useReadingStore.getState().updateSettings({
      speech: {
        rate: 1.6,
        continueAcrossPages: false,
        voiceByLanguage: {
          en: { mode: 'listed', voiceURI: 'current-en', lang: 'en-US' },
        },
        allowRemoteVoiceByLanguage: { en: true },
      },
    })

    useReadingStore.getState().importData(JSON.stringify({
      settings: { theme: 'sepia', fontSize: 20 },
    }))

    expect(useReadingStore.getState().settings).toMatchObject({ theme: 'sepia', fontSize: 20 })
    expect(useReadingStore.getState().settings.speech).toEqual(DEFAULT_SPEECH_SETTINGS)
  })

  it('keeps update patch semantics while imports restore bounded normalized speech', () => {
    useReadingStore.getState().updateSettings({
      theme: 'dark',
      speech: {
        rate: 1.3,
        continueAcrossPages: false,
        voiceByLanguage: {
          ja: { mode: 'listed', voiceURI: 'keep-ja', name: 'Keep', lang: 'ja-JP' },
        },
        allowRemoteVoiceByLanguage: { ja: true },
      },
    })

    expect(useReadingStore.getState().settings.speech).toEqual({
      rate: 1.3,
      continueAcrossPages: false,
      voiceByLanguage: {
        ja: { mode: 'listed', voiceURI: 'keep-ja', name: 'Keep', lang: 'ja-JP' },
      },
      allowRemoteVoiceByLanguage: { ja: true },
    })

    useReadingStore.getState().importData(JSON.stringify({
      settings: {
        fontSize: 19,
        speech: {
          rate: -9,
          voiceByLanguage: {
            ja: { mode: 'listed', lang: 'ja-JP' },
            en: { mode: 'ua-default', lang: 'en-US' },
          },
          allowRemoteVoiceByLanguage: { ja: 'yes', en: false },
        },
      },
    }))

    let settings = useReadingStore.getState().settings
    expect(settings).toMatchObject({ theme: 'dark', fontSize: 19 })
    expect(settings.speech.rate).toBe(SPEECH_RATE_MIN)
    expect(settings.speech.continueAcrossPages).toBe(true)
    expect(settings.speech.voiceByLanguage).toEqual({
      en: { mode: 'ua-default', lang: 'en-US' },
    })
    expect(settings.speech.allowRemoteVoiceByLanguage).toEqual({ en: false })

    useReadingStore.getState().importData('{"settings":{"speech":{"rate":99}}}')
    settings = useReadingStore.getState().settings
    expect(settings.speech.rate).toBe(SPEECH_RATE_MAX)
    expect(settings.theme).toBe('dark')
  })
})
