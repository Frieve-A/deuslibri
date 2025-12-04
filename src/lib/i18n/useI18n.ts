'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getTranslation,
  detectBrowserLanguage,
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
      language: 'en', // Default, will be overridden by browser detection on mount
      setLanguage: (language: SupportedLanguage) => {
        if (SUPPORTED_LANGUAGES.includes(language)) {
          set({ language, t: getTranslation(language) })
        }
      },
      t: getTranslation('en'),
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

// Initialize language from browser on first load (client-side only)
if (typeof window !== 'undefined') {
  const storedData = localStorage.getItem('deuslibri-i18n')
  if (!storedData) {
    // No stored preference, use browser language
    const browserLang = detectBrowserLanguage()
    useI18nStore.getState().setLanguage(browserLang)
  }
}

// Hook to use translations - provides type-safe access
export function useI18n() {
  const language = useI18nStore((state) => state.language)
  const setLanguage = useI18nStore((state) => state.setLanguage)
  const t = useI18nStore((state) => state.t)

  return { language, setLanguage, t }
}

// Export for direct access when needed
export { SUPPORTED_LANGUAGES, type SupportedLanguage }
