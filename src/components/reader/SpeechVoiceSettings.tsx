'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TranslationMessages } from '@/lib/i18n'
import { LANGUAGE_NAMES } from '@/lib/i18n'
import { selectVoice, speechLanguagesMatch } from '@/lib/reader/speech/selectVoice'
import { createBrowserSpeechSynthesisPort, type SpeechSynthesisPort } from '@/lib/reader/speech/SpeechSynthesisPort'
import type { SpeechSettings, SpeechVoice } from '@/lib/reader/speech/types'

const VOICE_DISCOVERY_TIMEOUT_MS = 3000
const SPEECH_LANGUAGES = ['en', 'ja'] as const

type VoiceListState = 'unsupported' | 'loading' | 'available' | 'unavailable'

export interface SpeechVoiceSettingsProps {
  t: TranslationMessages
  settings: SpeechSettings
  onChange: (settings: SpeechSettings) => void
  port?: SpeechSynthesisPort
}

function voiceLabel(voice: SpeechVoice, t: TranslationMessages): string {
  const location = voice.localService ? t.reader.speech.localVoice : t.reader.speech.remoteVoice
  return `${voice.name} (${voice.lang}) — ${location}`
}

export function SpeechVoiceSettings({ t, settings, onChange, port: providedPort }: SpeechVoiceSettingsProps) {
  const port = useMemo(() => providedPort ?? createBrowserSpeechSynthesisPort(), [providedPort])
  const [voices, setVoices] = useState<SpeechVoice[]>([])
  const [voiceListState, setVoiceListState] = useState<VoiceListState>('loading')

  useEffect(() => {
    if (!port.isSupported()) {
      setVoiceListState('unsupported')
      return
    }

    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const readVoices = () => {
      if (!active) return
      const nextVoices = port.getVoices()
      setVoices(nextVoices)
      if (nextVoices.length) {
        if (timeout !== undefined) clearTimeout(timeout)
        timeout = undefined
        setVoiceListState('available')
      } else if (timeout === undefined) {
        setVoiceListState('loading')
        timeout = setTimeout(() => {
          timeout = undefined
          if (!active) return
          if (port.getVoices().length) {
            readVoices()
            return
          }
          setVoiceListState('unavailable')
        }, VOICE_DISCOVERY_TIMEOUT_MS)
      }
    }

    const unsubscribe = port.onVoicesChanged(readVoices)
    readVoices()
    return () => {
      active = false
      unsubscribe()
      if (timeout !== undefined) clearTimeout(timeout)
    }
  }, [port])

  if (voiceListState === 'unsupported') {
    return <p className="text-sm text-gray-600 dark:text-gray-300">{t.reader.speech.unsupported}</p>
  }
  if (voiceListState === 'loading') {
    return <p className="text-sm text-gray-600 dark:text-gray-300">{t.reader.speech.loadingVoices}</p>
  }
  if (voiceListState === 'unavailable') {
    return <p className="text-sm text-gray-600 dark:text-gray-300">{t.reader.speech.voiceListUnavailable}</p>
  }

  return (
    <div className="space-y-5">
      {SPEECH_LANGUAGES.map((language) => {
        const matchingVoices = voices.filter((voice) => speechLanguagesMatch(voice.lang, language))
        const allowRemoteVoice = settings.allowRemoteVoiceByLanguage[language] ?? false
        const selection = selectVoice(voices, language, settings.voiceByLanguage[language], allowRemoteVoice)
        const selectedVoiceURI = selection.mode === 'listed' ? selection.voice?.voiceURI ?? '' : ''

        return (
          <fieldset key={language} className="space-y-3 rounded-lg border border-amber-200 p-4 dark:border-gray-700">
            <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              {LANGUAGE_NAMES[language]}
            </legend>

            <div>
              <label htmlFor={`speechVoice-${language}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.reader.speech.voice}
              </label>
              <select
                id={`speechVoice-${language}`}
                value={selectedVoiceURI}
                disabled={matchingVoices.length === 0}
                onChange={(event) => {
                  const voice = matchingVoices.find((candidate) => candidate.voiceURI === event.target.value)
                  if (!voice || (!voice.localService && !allowRemoteVoice)) return
                  onChange({
                    ...settings,
                    voiceByLanguage: {
                      ...settings.voiceByLanguage,
                      [language]: {
                        mode: 'listed',
                        voiceURI: voice.voiceURI,
                        name: voice.name,
                        lang: voice.lang,
                        localService: voice.localService,
                      },
                    },
                  })
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-sky-400 ui-skin-input"
              >
                <option value="" disabled>{t.reader.speech.voice}</option>
                {matchingVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI} disabled={!voice.localService && !allowRemoteVoice}>
                    {voiceLabel(voice, t)}
                  </option>
                ))}
              </select>
              {matchingVoices.length === 0 && (
                <div className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>{t.reader.speech.noMatchingVoice}</p>
                  <p>{t.reader.speech.voiceSetupHelp}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  id={`allowRemoteVoice-${language}`}
                  type="checkbox"
                  checked={allowRemoteVoice}
                  onChange={(event) => onChange({
                    ...settings,
                    allowRemoteVoiceByLanguage: {
                      ...settings.allowRemoteVoiceByLanguage,
                      [language]: event.target.checked,
                    },
                  })}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
                />
                <label htmlFor={`allowRemoteVoice-${language}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.reader.speech.allowRemoteVoice}
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.reader.speech.remoteVoiceNotice}</p>
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
