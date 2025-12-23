'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getTranslation,
  detectBrowserLanguage,
  getBrowserLanguageCode,
  TranslationMessages,
} from './translations'

interface I18nState {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: TranslationMessages
}

// Create a separate store for i18n to avoid conflicts with reading store
export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'default', // Default uses browser language
      setLanguage: (language: SupportedLanguage) => {
        if (SUPPORTED_LANGUAGES.includes(language)) {
          set({ language, t: getTranslation(language) })
        }
      },
      t: getTranslation('default'),
    }),
    {
      name: 'deuslibri-i18n',
      onRehydrateStorage: () => (state) => {
        // After rehydration, ensure translations are in sync
        if (state) {
          state.t = getTranslation(state.language)
        }
      },
    }
  )
)

// Hook to use translations - provides type-safe access
export function useI18n() {
  const language = useI18nStore((state) => state.language)
  const setLanguage = useI18nStore((state) => state.setLanguage)
  const t = useI18nStore((state) => state.t)

  // Get the effective language for catalog sorting:
  // - If 'default', use the raw browser language code (e.g., 'fr', 'de', 'ja')
  // - Otherwise, use the explicitly set language
  const effectiveLanguage = language === 'default'
    ? getBrowserLanguageCode()
    : language

  return { language, setLanguage, t, effectiveLanguage }
}

// Export for direct access when needed
export { SUPPORTED_LANGUAGES, type SupportedLanguage }
