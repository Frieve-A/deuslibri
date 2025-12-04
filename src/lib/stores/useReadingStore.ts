import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export interface ReadingSettings {
  writingMode: 'horizontal' | 'vertical' // vertical only for Japanese
  displayMode: 'pagination' | 'scroll'
  fontSize: number // in pixels
  theme: 'light' | 'dark' | 'auto'
  fontFamily: FontFamily
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
          settings: { ...state.settings, ...newSettings },
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
            settings: parsed.settings || get().settings,
          })
        } catch (error) {
          console.error('Failed to import data:', error)
        }
      },
    }),
    {
      name: 'deuslibri-reading-storage',
    }
  )
)
