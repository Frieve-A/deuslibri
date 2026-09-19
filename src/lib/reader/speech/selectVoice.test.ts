import { describe, expect, it } from 'vitest'
import { canonicalSpeechLanguage, normalizeSpeechLanguage, selectVoice } from './selectVoice'
import { normalizeSpeechSettings, SPEECH_RATE_MAX, SPEECH_RATE_MIN } from './types'
import type { SpeechVoice } from './types'

const voice = (voiceURI: string, lang: string, localService = true, isDefault = false): SpeechVoice =>
  ({ voiceURI, name: voiceURI, lang, localService, default: isDefault })

describe('voice selection', () => {
  it('normalizes canonical and book languages', () => {
    expect(normalizeSpeechLanguage('JA')).toBe('ja-JP')
    expect(normalizeSpeechLanguage('en')).toBe('en-US')
    expect(normalizeSpeechLanguage('EN_gb')).toBe('en-GB')
    expect(canonicalSpeechLanguage('broken!')).toBeNull()
  })
  it('prefers exact local language, then local base language, then default', () => {
    const voices = [voice('remote', 'ja-JP', false, true), voice('base', 'ja', true, true), voice('exact', 'JA-jp')]
    expect(selectVoice(voices, 'ja').voice?.voiceURI).toBe('exact')
    expect(selectVoice(voices.slice(0, 2), 'ja').voice?.voiceURI).toBe('base')
    expect(selectVoice([voice('other', 'en-GB'), voice('default', 'en-GB', true, true)], 'en-US').voice?.voiceURI).toBe('default')
  })
  it('restores an explicit listed selection and requires consent for remote', () => {
    const voices = [voice('local', 'en-US'), voice('remote', 'en-US', false)]
    const saved = { mode: 'listed' as const, voiceURI: 'remote', lang: 'en-US' }
    expect(selectVoice(voices, 'en', saved).voice?.voiceURI).toBe('local')
    expect(selectVoice(voices, 'en', saved, true)).toMatchObject({ voice: voices[1], isFallback: false })
    expect(selectVoice([voices[1]], 'en', undefined, true).mode).toBe('unavailable')
  })
  it('keeps missing persisted voices intact and uses local alternatives only', () => {
    const saved = { mode: 'listed' as const, voiceURI: 'gone', lang: 'ja-JP' }
    expect(selectVoice([voice('available', 'ja')], 'ja', saved)).toMatchObject({ isFallback: true, mode: 'listed' })
    expect(saved.voiceURI).toBe('gone')
    expect(selectVoice([voice('remote', 'ja', false)], 'ja', saved, true).mode).toBe('unavailable')
    expect(selectVoice([voice('wrong', 'en-US')], 'ja').mode).toBe('unavailable')
  })
  it('allows UA default only through an explicit language-matching saved mode', () => {
    expect(selectVoice([], 'ja').mode).toBe('unavailable')
    expect(selectVoice([], 'ja', { mode: 'ua-default', lang: 'ja' })).toEqual({ voice: null, mode: 'ua-default', isFallback: false })
    expect(selectVoice([], 'en', { mode: 'ua-default', lang: 'ja' }).mode).toBe('unavailable')
  })
})

describe('speech setting normalization', () => {
  it('fills old/partial imports and creates independent default dictionaries', () => {
    const first = normalizeSpeechSettings(undefined)
    expect(first).toEqual({ rate: 1.5, continueAcrossPages: true, voiceByLanguage: {}, allowRemoteVoiceByLanguage: {} })
    first.allowRemoteVoiceByLanguage.ja = true
    expect(normalizeSpeechSettings({}).allowRemoteVoiceByLanguage).toEqual({})
    expect(normalizeSpeechSettings({ continueAcrossPages: false }).continueAcrossPages).toBe(false)
  })
  it('bounds rates and rejects malformed or nonserializable values', () => {
    expect(normalizeSpeechSettings({ rate: -9 }).rate).toBe(SPEECH_RATE_MIN)
    expect(normalizeSpeechSettings({ rate: 8 }).rate).toBe(8)
    expect(normalizeSpeechSettings({ rate: 10 }).rate).toBe(10)
    expect(normalizeSpeechSettings({ rate: 11 }).rate).toBe(SPEECH_RATE_MAX)
    expect(normalizeSpeechSettings({ rate: NaN }).rate).toBe(1.5)
    expect(normalizeSpeechSettings({ rate: '2', voiceByLanguage: { ja: { mode: 'bad' }, en: null }, allowRemoteVoiceByLanguage: { ja: 'true' } }))
      .toEqual(normalizeSpeechSettings(undefined))
  })
})
