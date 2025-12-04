// Re-export all i18n utilities
export {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  translations,
  getTranslation,
  detectBrowserLanguage,
  type SupportedLanguage,
  type TranslationMessages,
} from './translations'

export { useI18n, useI18nStore } from './useI18n'
