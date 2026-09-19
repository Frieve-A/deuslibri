import type { SavedSpeechVoice, SpeechVoice } from './types'

/** Invalid embedded lang attributes should inherit their parent's language. */
export function canonicalSpeechLanguage(language: string): string | null {
  try { return Intl.getCanonicalLocales(language.trim().replace(/_/g, '-'))[0] ?? null }
  catch { return null }
}

export function normalizeSpeechLanguage(language: string): string {
  const canonical = canonicalSpeechLanguage(language) ?? 'en-US'
  return canonical === 'ja' ? 'ja-JP' : canonical === 'en' ? 'en-US' : canonical
}

export function speechLanguagesMatch(left: string, right: string): boolean {
  const a = canonicalSpeechLanguage(left)
  const b = canonicalSpeechLanguage(right)
  return !!a && !!b && a.split('-')[0] === b.split('-')[0]
}

export interface SpeechVoiceSelection {
  voice: SpeechVoice | null
  mode: 'listed' | 'ua-default' | 'unavailable'
  isFallback: boolean
}

export function selectVoice(
  voices: readonly SpeechVoice[], language: string,
  saved?: SavedSpeechVoice, allowRemote = false,
): SpeechVoiceSelection {
  const lang = normalizeSpeechLanguage(language)
  const savedMatches = saved && speechLanguagesMatch(saved.lang, lang)
  if (savedMatches && saved.mode === 'ua-default') {
    return { voice: null, mode: 'ua-default', isFallback: false }
  }
  const candidates = voices.filter(voice => speechLanguagesMatch(voice.lang, lang))
  if (savedMatches && saved.mode === 'listed') {
    const restored = candidates.find(voice => voice.voiceURI === saved.voiceURI)
    if (restored && (restored.localService || allowRemote)) {
      return { voice: restored, mode: 'listed', isFallback: false }
    }
  }
  // Remote consent permits a particular saved selection, never automatic remote selection.
  const local = candidates.filter(voice => voice.localService)
  const score = (voice: SpeechVoice) =>
    (canonicalSpeechLanguage(voice.lang) === lang ? 2 : 0) + (voice.default ? 1 : 0)
  local.sort((a, b) => score(b) - score(a))
  return { voice: local[0] ?? null, mode: local.length ? 'listed' : 'unavailable', isFallback: !!saved }
}
