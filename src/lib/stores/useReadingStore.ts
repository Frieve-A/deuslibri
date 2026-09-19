import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_SPEECH_SETTINGS,
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  normalizeSpeechSettings,
  type SpeechSettings as ReaderSpeechSettings,
} from '@/lib/reader/speech/types'

export { DEFAULT_SPEECH_SETTINGS, SPEECH_RATE_MAX, SPEECH_RATE_MIN, normalizeSpeechSettings }

export interface ReadingProgress {
  bookId: string
  language: string
  currentPage: number
  lastRead: string
  scrollPosition?: number  // For scroll mode: scrollTop (horizontal) or scrollLeft (vertical)
}

export interface FavoriteBook {
  bookId: string
  language: string
  addedAt: string
}

export interface Bookmark {
  bookId: string
  language: string
  pageIndex: number
  note: string
  createdAt: string
}

export type FontFamily = 'system' | 'serif' | 'sans-serif' | 'mincho' | 'gothic'

export type UserInteractionBehavior = 'pause' | 'autoResume'

export interface AutoScrollSettings {
  enabled: boolean
  speed: number // pixels per second (1-100)
  startDelay: number // milliseconds (0-10000)
  autoPageTurn: boolean
  autoPageTurnDelay: number // milliseconds (1000-30000)
  userInteractionBehavior: UserInteractionBehavior
}

export interface InteractionSettings {
  enableTapScroll: boolean // Tap to scroll within page
  enableTapPageTurn: boolean // Tap to turn page
  enableFlickScroll: boolean // Flick to scroll within page (not currently implemented separately)
  enableFlickPageTurn: boolean // Flick to turn page
}

export type SpeechVoiceSelectionMode = 'listed' | 'ua-default'

export interface SpeechVoiceSelection {
  mode: SpeechVoiceSelectionMode
  voiceURI?: string
  name?: string
  lang: string
  localService?: boolean
}

export type SpeechSettings = ReaderSpeechSettings

export interface ReadingSettings {
  writingMode: 'horizontal' | 'vertical' // vertical only for Japanese
  displayMode: 'pagination' | 'scroll'
  fontSize: number // in pixels
  theme: 'light' | 'dark' | 'sepia' | 'auto'
  fontFamily: FontFamily
  lineHeight: number // 1.0 - 3.0
  marginSize: 'small' | 'medium' | 'large'
  brightness: number // 0 - 100
  autoScroll: AutoScrollSettings
  interaction: InteractionSettings
  speech: SpeechSettings
}

interface ReadingState {
  // Reading progress
  progress: Record<string, ReadingProgress>
  setProgress: (bookId: string, language: string, page: number, scrollPosition?: number) => void
  getProgress: (bookId: string, language: string) => ReadingProgress | null

  // Favorites
  favorites: FavoriteBook[]
  addFavorite: (bookId: string, language: string) => void
  removeFavorite: (bookId: string, language: string) => void
  isFavorite: (bookId: string, language: string) => boolean

  // Recently read
  recentlyRead: ReadingProgress[]
  updateRecentlyRead: (bookId: string, language: string) => void

  // Bookmarks
  bookmarks: Bookmark[]
  addBookmark: (bookId: string, language: string, pageIndex: number, note?: string) => void
  removeBookmark: (bookId: string, language: string, pageIndex: number) => void
  getBookmarks: (bookId: string, language: string) => Bookmark[]
  hasBookmark: (bookId: string, language: string, pageIndex: number) => boolean

  // Settings
  settings: ReadingSettings
  updateSettings: (settings: Partial<ReadingSettings>) => void

  // Export/Import
  exportData: () => string
  importData: (data: string) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const mergeSpeechSettings = (base: SpeechSettings, candidate: unknown): SpeechSettings => {
  const normalizedBase = normalizeSpeechSettings(base)
  if (!isRecord(candidate)) return normalizedBase

  const normalizedCandidate = normalizeSpeechSettings({
    voiceByLanguage: candidate.voiceByLanguage,
    allowRemoteVoiceByLanguage: candidate.allowRemoteVoiceByLanguage,
  })

  return normalizeSpeechSettings({
    rate: typeof candidate.rate === 'number' && Number.isFinite(candidate.rate)
      ? candidate.rate : normalizedBase.rate,
    continueAcrossPages: typeof candidate.continueAcrossPages === 'boolean'
      ? candidate.continueAcrossPages : normalizedBase.continueAcrossPages,
    voiceByLanguage: {
      ...normalizedBase.voiceByLanguage,
      ...normalizedCandidate.voiceByLanguage,
    },
    allowRemoteVoiceByLanguage: {
      ...normalizedBase.allowRemoteVoiceByLanguage,
      ...normalizedCandidate.allowRemoteVoiceByLanguage,
    },
  })
}

const mergeReadingSettings = (base: ReadingSettings, candidate: unknown): ReadingSettings => {
  if (!isRecord(candidate)) return base

  return {
    ...base,
    ...candidate,
    autoScroll: {
      ...base.autoScroll,
      ...(isRecord(candidate.autoScroll) ? candidate.autoScroll : {}),
    },
    interaction: {
      ...base.interaction,
      ...(isRecord(candidate.interaction) ? candidate.interaction : {}),
    },
    speech: mergeSpeechSettings(base.speech, candidate.speech),
  } as ReadingSettings
}

const restoreReadingSettings = (base: ReadingSettings, candidate: unknown): ReadingSettings => ({
  ...mergeReadingSettings(base, candidate),
  speech: mergeSpeechSettings(
    DEFAULT_SPEECH_SETTINGS,
    isRecord(candidate) ? candidate.speech : undefined
  ),
})

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      // Initial state
      progress: {},
      favorites: [],
      recentlyRead: [],
      bookmarks: [],
      settings: {
        writingMode: 'horizontal',
        displayMode: 'pagination',
        fontSize: 16,
        theme: 'auto',
        fontFamily: 'system',
        lineHeight: 1.8,
        marginSize: 'medium',
        brightness: 100,
        autoScroll: {
          enabled: false,
          speed: 50,
          startDelay: 5000,
          autoPageTurn: false,
          autoPageTurnDelay: 15000,
          userInteractionBehavior: 'pause',
        },
        interaction: {
          enableTapScroll: true,
          enableTapPageTurn: true,
          enableFlickScroll: true,
          enableFlickPageTurn: true,
        },
        speech: DEFAULT_SPEECH_SETTINGS,
      },

      // Progress methods
      setProgress: (bookId, language, page, scrollPosition) => {
        const key = `${bookId}-${language}`
        set((state) => ({
          progress: {
            ...state.progress,
            [key]: {
              bookId,
              language,
              currentPage: page,
              lastRead: new Date().toISOString(),
              scrollPosition: scrollPosition ?? state.progress[key]?.scrollPosition,
            },
          },
        }))
        get().updateRecentlyRead(bookId, language)
      },

      getProgress: (bookId, language) => {
        const key = `${bookId}-${language}`
        return get().progress[key] || null
      },

      // Favorites methods
      addFavorite: (bookId, language) => {
        set((state) => {
          const exists = state.favorites.some(
            (f) => f.bookId === bookId && f.language === language
          )
          if (exists) return state

          return {
            favorites: [
              ...state.favorites,
              { bookId, language, addedAt: new Date().toISOString() },
            ],
          }
        })
      },

      removeFavorite: (bookId, language) => {
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.bookId === bookId && f.language === language)
          ),
        }))
      },

      isFavorite: (bookId, language) => {
        return get().favorites.some(
          (f) => f.bookId === bookId && f.language === language
        )
      },

      // Recently read methods
      updateRecentlyRead: (bookId, language) => {
        set((state) => {
          const filtered = state.recentlyRead.filter(
            (r) => !(r.bookId === bookId && r.language === language)
          )

          const progress = get().getProgress(bookId, language)
          if (!progress) return state

          return {
            recentlyRead: [progress, ...filtered].slice(0, 20), // Keep last 20
          }
        })
      },

      // Bookmark methods
      addBookmark: (bookId, language, pageIndex, note = '') => {
        set((state) => {
          const exists = state.bookmarks.some(
            (b) => b.bookId === bookId && b.language === language && b.pageIndex === pageIndex
          )
          if (exists) return state

          return {
            bookmarks: [
              ...state.bookmarks,
              {
                bookId,
                language,
                pageIndex,
                note,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        })
      },

      removeBookmark: (bookId, language, pageIndex) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter(
            (b) => !(b.bookId === bookId && b.language === language && b.pageIndex === pageIndex)
          ),
        }))
      },

      getBookmarks: (bookId, language) => {
        return get().bookmarks.filter(
          (b) => b.bookId === bookId && b.language === language
        ).sort((a, b) => a.pageIndex - b.pageIndex)
      },

      hasBookmark: (bookId, language, pageIndex) => {
        return get().bookmarks.some(
          (b) => b.bookId === bookId && b.language === language && b.pageIndex === pageIndex
        )
      },

      // Settings methods
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: mergeReadingSettings(state.settings, newSettings),
        }))
      },

      // Export/Import methods
      exportData: () => {
        const state = get()
        return JSON.stringify({
          progress: state.progress,
          favorites: state.favorites,
          recentlyRead: state.recentlyRead,
          bookmarks: state.bookmarks,
          settings: state.settings,
        })
      },

      importData: (data) => {
        try {
          const parsed = JSON.parse(data)
          set({
            progress: parsed.progress || {},
            favorites: parsed.favorites || [],
            recentlyRead: parsed.recentlyRead || [],
            bookmarks: parsed.bookmarks || [],
            settings: restoreReadingSettings(get().settings, parsed.settings),
          })
        } catch (error) {
          console.error('Failed to import data:', error)
        }
      },
    }),
    {
      name: 'deuslibri-reading-storage',
      // Custom merge to handle nested objects and new properties
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ReadingState>

        // Deep merge settings to ensure new properties get defaults
        const mergedSettings = mergeReadingSettings(currentState.settings, persisted.settings)

        return {
          ...currentState,
          ...persisted,
          settings: mergedSettings,
        }
      },
    }
  )
)
