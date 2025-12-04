'use client'

import { TocItem } from '@/types/book'
import { Bookmark } from '@/lib/stores/useReadingStore'
import { TranslationMessages } from '@/lib/i18n'

interface ReaderHeaderProps {
  book: {
    id: string
    title: string
    author: string
    language: string
  }
  toc: TocItem[]
  bookmarks: Bookmark[]
  isTocOpen: boolean
  setIsTocOpen: (open: boolean) => void
  favorite: boolean
  toggleFavorite: () => void
  isBookmarked: boolean
  toggleBookmark: () => void
  isPagination: boolean
  t: TranslationMessages
}

export function ReaderHeader({
  book,
  toc,
  bookmarks,
  isTocOpen,
  setIsTocOpen,
  favorite,
  toggleFavorite,
  isBookmarked,
  toggleBookmark,
  isPagination,
  t,
}: ReaderHeaderProps) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleShare = (platform: 'twitter' | 'facebook') => {
    const text = `Reading "${book.title}" by ${book.author}`
    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
        '_blank'
      )
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        '_blank'
      )
    }
  }

  return (
    <header className="border-b border-amber-200 dark:border-gray-700 p-4 bg-amber-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Hamburger Menu Button - available in both pagination and scroll modes */}
          {(toc.length > 0 || bookmarks.length > 0) && (
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className="p-2 bg-amber-700 dark:bg-sky-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 transition-all flex-shrink-0"
              aria-label="Toggle table of contents"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate text-gray-900 dark:text-white">{book.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {book.author}
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={toggleFavorite}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label="Toggle favorite"
          >
            {favorite ? '❤️' : '🤍'}
          </button>
          {isPagination && (
            <button
              onClick={toggleBookmark}
              className="text-2xl hover:scale-110 transition-transform"
              aria-label="Toggle bookmark"
            >
              {isBookmarked ? '🔖' : '📑'}
            </button>
          )}
          <button
            onClick={() => handleShare('twitter')}
            className="p-2 bg-black text-white rounded hover:bg-gray-800 transition-colors hidden sm:flex items-center justify-center"
            aria-label={t.reader.tweet}
          >
            {/* X (Twitter) Logo */}
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          <button
            onClick={() => handleShare('facebook')}
            className="p-2 bg-[#1877F2] text-white rounded hover:bg-[#166FE5] transition-colors hidden sm:flex items-center justify-center"
            aria-label={t.reader.share}
          >
            {/* Facebook Logo */}
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
          <a
            href="/catalog"
            className="px-3 py-1 text-sm bg-amber-100 dark:bg-gray-700 text-amber-900 dark:text-gray-200 rounded hover:bg-amber-200 dark:hover:bg-gray-600"
          >
            {t.reader.catalog}
          </a>
        </div>
      </div>
    </header>
  )
}
