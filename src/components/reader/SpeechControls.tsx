'use client'

import type { TranslationMessages } from '@/lib/i18n'
import { SPEECH_RATE_MIN, SPEECH_RATE_MAX, SPEECH_RATE_STEP, type SpeechVoice } from '@/lib/reader/speech/types'

export type SpeechControlsState =
  | 'unsupported'
  | 'loadingVoices'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'errorStopped'

export type SpeechVoiceListState = 'loading' | 'available' | 'no-matching' | 'unavailable'

/**
 * Presentational contract between the reader and the speech controller.
 * All callbacks are user-event callbacks; this component never starts speech
 * from an effect or from a state transition.
 */
export interface SpeechControlsProps {
  t: TranslationMessages
  state: SpeechControlsState
  voiceListState: SpeechVoiceListState
  voices: readonly SpeechVoice[]
  selectedVoiceURI?: string
  selectedVoiceMode: 'listed' | 'ua-default' | 'unavailable'
  allowRemoteVoice: boolean
  rate: number
  continueAcrossPages: boolean
  canTryDefaultVoice: boolean
  /** A saved voice was unavailable and the controller selected a fallback. */
  isFallback?: boolean
  statusMessage?: string
  /** Keeps the fixed reader header at its existing compact height. */
  compact?: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onRateChange: (rate: number) => void
  onContinueAcrossPagesChange: (enabled: boolean) => void
  onRemoteVoiceConsentChange: (allowed: boolean) => void
  onVoiceChange: (voice: SpeechVoice | null, mode: 'listed' | 'ua-default') => void
  onTryDefaultVoice: () => void
}

function PlaybackIcon({ state }: { state: SpeechControlsState }) {
  return <span aria-hidden="true">{state === 'playing' ? 'Ⅱ' : '▶'}</span>
}

function voiceLabel(voice: SpeechVoice, t: TranslationMessages): string {
  const location = voice.localService ? t.reader.speech.localVoice : t.reader.speech.remoteVoice
  return `${voice.name} (${voice.lang}) — ${location}`
}

export function SpeechControls({
  t,
  state,
  voiceListState,
  voices,
  selectedVoiceURI,
  selectedVoiceMode,
  allowRemoteVoice,
  rate,
  continueAcrossPages,
  canTryDefaultVoice,
  isFallback = false,
  statusMessage,
  compact = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onRateChange,
  onContinueAcrossPagesChange,
  onRemoteVoiceConsentChange,
  onVoiceChange,
  onTryDefaultVoice,
}: SpeechControlsProps) {
  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'
  const isUnsupported = state === 'unsupported'
  const isLoading = state === 'loadingVoices' || voiceListState === 'loading'
  const isActive = isPlaying || isPaused
  const selectedVoice = selectedVoiceMode === 'listed'
    ? voices.find((voice) => voice.voiceURI === selectedVoiceURI)
    : null
  const tryDefaultOnPlay = compact && canTryDefaultVoice && voiceListState === 'unavailable' && selectedVoiceMode === 'unavailable'
  const canStart = !isUnsupported && !isLoading && (
    tryDefaultOnPlay || selectedVoiceMode === 'ua-default'
    || !!selectedVoice && (selectedVoice.localService || allowRemoteVoice)
  )
  const hasVoiceOptions = voices.length > 0
  const fallbackNotice = isFallback ? t.reader.speech.fallbackVoice : ''
  const hasStatusDetails = isUnsupported || isLoading || voiceListState === 'no-matching'
    || isFallback || selectedVoiceMode === 'ua-default' || voiceListState === 'unavailable'
  const status = statusMessage ?? (
    state === 'unsupported' ? t.reader.speech.unsupported
      : state === 'playing' ? t.reader.speech.started
        : state === 'paused' ? t.reader.speech.paused
          : state === 'completed' ? t.reader.speech.completed
            : state === 'errorStopped' ? t.reader.speech.error
              : state === 'stopped' ? t.reader.speech.stopped
                : isLoading ? t.reader.speech.loadingVoices
                  : ''
  )

  const handleVoiceChange = (value: string) => {
    const voice = voices.find((candidate) => candidate.voiceURI === value)
    if (voice && (voice.localService || allowRemoteVoice)) {
      onVoiceChange(voice, 'listed')
    }
  }

  const settingsContent = (
    <div className="space-y-4">
      <div>
        <label htmlFor="readerSpeechRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.reader.speech.rate}: {rate.toFixed(1)}×
        </label>
        <input
          id="readerSpeechRate"
          type="range"
          min={SPEECH_RATE_MIN}
          max={SPEECH_RATE_MAX}
          step={SPEECH_RATE_STEP}
          value={rate}
          onChange={(event) => onRateChange(Number(event.target.value))}
          className="mt-2 w-full ui-skin-range"
        />
      </div>

      <div>
        <label htmlFor="readerSpeechVoice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.reader.speech.voice}
        </label>
        <select
          id="readerSpeechVoice"
          value={selectedVoiceURI ?? ''}
          onChange={(event) => handleVoiceChange(event.target.value)}
          disabled={!hasVoiceOptions}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-sky-400 ui-skin-input"
        >
          <option value="" disabled>{t.reader.speech.voice}</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI} disabled={!voice.localService && !allowRemoteVoice}>
              {voiceLabel(voice, t)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            id="readerAllowRemoteVoice"
            type="checkbox"
            checked={allowRemoteVoice}
            onChange={(event) => onRemoteVoiceConsentChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
          />
          <label htmlFor="readerAllowRemoteVoice" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t.reader.speech.allowRemoteVoice}
          </label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t.reader.speech.remoteVoiceNotice}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="readerSpeechContinueAcrossPages"
          type="checkbox"
          checked={continueAcrossPages}
          onChange={(event) => onContinueAcrossPagesChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
        />
        <label htmlFor="readerSpeechContinueAcrossPages" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.reader.speech.continueAcrossPages}
        </label>
      </div>
    </div>
  )

  const statusDetails = (
    <>
      {isUnsupported && <p className="text-sm text-gray-600 dark:text-gray-300">{t.reader.speech.unsupported}</p>}
      {isLoading && <p className="text-sm text-gray-600 dark:text-gray-300">{t.reader.speech.loadingVoices}</p>}
      {voiceListState === 'no-matching' && (
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>{t.reader.speech.noMatchingVoice}</p>
          <p className="text-xs">{t.reader.speech.voiceSetupHelp}</p>
        </div>
      )}
      {isFallback && (
        <p className="text-xs text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
          {fallbackNotice}
        </p>
      )}
      {selectedVoiceMode === 'ua-default' && (
        <p className="text-xs text-gray-600 dark:text-gray-300">{t.reader.speech.defaultVoiceNotice}</p>
      )}
      {voiceListState === 'unavailable' && (
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>{t.reader.speech.voiceListUnavailable}</p>
          {canTryDefaultVoice && (
            <>
              {selectedVoiceMode !== 'ua-default' && <p className="text-xs">{t.reader.speech.defaultVoiceNotice}</p>}
              <button
                type="button"
                onClick={onTryDefaultVoice}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-slate-600 dark:focus:ring-sky-400 ui-skin-button"
              >
                {t.reader.speech.tryDefaultVoice}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )

  return (
    <section className={`rounded-lg border border-amber-200 bg-amber-50 shadow-sm dark:border-gray-700 dark:bg-slate-800 ui-skin-panel ${compact ? 'relative p-1.5' : 'p-3'}`} aria-label={t.settings.speech.title}>
      <div className={`flex items-center gap-2 ${compact ? 'min-w-0 flex-nowrap' : 'flex-wrap'}`}>
        <button
          type="button"
          onClick={isPlaying ? onPause : isPaused ? onResume : tryDefaultOnPlay ? onTryDefaultVoice : onStart}
          disabled={!isActive && !canStart}
          aria-label={isPlaying ? t.reader.speech.pause : isPaused ? t.reader.speech.resume : t.reader.speech.play}
          title={isPlaying ? t.reader.speech.pause : isPaused ? t.reader.speech.resume : t.reader.speech.play}
          aria-pressed={isActive}
          className={`inline-flex items-center gap-2 rounded-lg bg-amber-700 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-700 dark:focus:ring-sky-400 ui-skin-primary ${compact ? 'h-10 w-10 shrink-0 justify-center p-0' : 'min-h-10 px-3 py-2'}`}
        >
          <PlaybackIcon state={state} />
          <span className={compact ? 'sr-only' : ''}>{isPlaying ? t.reader.speech.pause : isPaused ? t.reader.speech.resume : t.reader.speech.play}</span>
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!isActive}
          aria-label={t.reader.speech.stop}
          title={t.reader.speech.stop}
          className={`rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-slate-600 dark:focus:ring-sky-400 ui-skin-button ${compact ? 'h-10 w-10 shrink-0 inline-flex items-center justify-center p-0' : 'min-h-10 px-3 py-2'}`}
        >
          <span className={compact ? 'sr-only' : ''}>{t.reader.speech.stop}</span>
          {compact && <span aria-hidden="true">■</span>}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </p>

      {!compact && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-gray-100 dark:focus:ring-sky-400">
            {t.reader.speech.settings}
          </summary>
          <div className="mt-3">{settingsContent}</div>
        </details>
      )}

      {!compact && hasStatusDetails && <div className="mt-3 space-y-3">{statusDetails}</div>}
    </section>
  )
}
