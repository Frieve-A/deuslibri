export type SpeechSegmentKind = 'heading' | 'paragraph' | 'list-item' | 'quote' | 'table-row' | 'caption' | 'math'

export interface SpeechSegment {
  id: string
  pageIndex: number
  blockIndex: number
  text: string
  lang: string
  kind: SpeechSegmentKind
}

/** Serializable voice metadata. Native voice objects stay inside the adapter. */
export interface SpeechVoice {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export interface SavedSpeechVoice {
  mode: 'listed' | 'ua-default'
  voiceURI?: string
  name?: string
  lang: string
  localService?: boolean
}

export interface SpeechSettings {
  rate: number
  continueAcrossPages: boolean
  voiceByLanguage: Record<string, SavedSpeechVoice>
  allowRemoteVoiceByLanguage: Record<string, boolean>
}

export const SPEECH_RATE_MIN = 0.5
export const SPEECH_RATE_MAX = 10
export const SPEECH_RATE_STEP = 0.1
export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  rate: 1.5,
  continueAcrossPages: true,
  voiceByLanguage: {},
  allowRemoteVoiceByLanguage: {},
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

/** Accept old imports and persisted partial settings without trusting their types. */
export function normalizeSpeechSettings(value: unknown): SpeechSettings {
  const input = record(value)
  const voices: SpeechSettings['voiceByLanguage'] = {}
  for (const [language, raw] of Object.entries(record(input.voiceByLanguage))) {
    const voice = record(raw)
    const normalizedLanguage = language.trim().toLowerCase()
    const lang = typeof voice.lang === 'string' ? voice.lang.trim() : ''
    const mode = voice.mode === 'listed' || voice.mode === 'ua-default' ? voice.mode : null
    const voiceURI = typeof voice.voiceURI === 'string' ? voice.voiceURI.trim() : ''
    const name = typeof voice.name === 'string' ? voice.name.trim() : ''
    if (!normalizedLanguage || !lang || !mode || (mode === 'listed' && !voiceURI)) continue
    Object.defineProperty(voices, normalizedLanguage, { enumerable: true, configurable: true, writable: true, value: {
      mode: voice.mode,
      lang,
      ...(voiceURI ? { voiceURI } : {}),
      ...(name ? { name } : {}),
      ...(typeof voice.localService === 'boolean' ? { localService: voice.localService } : {}),
    } })
  }
  const remote: Record<string, boolean> = {}
  for (const [language, allowed] of Object.entries(record(input.allowRemoteVoiceByLanguage))) {
    const normalizedLanguage = language.trim().toLowerCase()
    if (normalizedLanguage && typeof allowed === 'boolean') Object.defineProperty(remote, normalizedLanguage, {
      value: allowed, enumerable: true, configurable: true, writable: true,
    })
  }
  return {
    rate: typeof input.rate === 'number' && Number.isFinite(input.rate)
      ? Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, input.rate)) : DEFAULT_SPEECH_SETTINGS.rate,
    continueAcrossPages: typeof input.continueAcrossPages === 'boolean'
      ? input.continueAcrossPages : DEFAULT_SPEECH_SETTINGS.continueAcrossPages,
    voiceByLanguage: voices,
    allowRemoteVoiceByLanguage: remote,
  }
}
