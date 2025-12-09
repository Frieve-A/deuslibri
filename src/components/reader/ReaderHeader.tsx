'use client'

import { useState, useRef, useEffect } from 'react'
import { TocItem } from '@/types/book'
import { Bookmark } from '@/lib/stores/useReadingStore'
import { TranslationMessages } from '@/lib/i18n'
import { useRouter, usePathname } from 'next/navigation'

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
  currentPage: number
  t: TranslationMessages
  onTitleClick?: () => void
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
  currentPage,
  t,
  onTitleClick,
}: ReaderHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [shareMenuOpen, setShareMenuOpen] = useState<'twitter' | 'facebook' | null>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(null)
      }
    }
    if (shareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [shareMenuOpen])

  // Generate URLs for sharing
  const getShareUrls = () => {
    if (typeof window === 'undefined') return { bookUrl: '', pageUrl: '' }
    const origin = window.location.origin
    const bookUrl = `${origin}${pathname}`
    const pageUrl = isPagination ? `${origin}${pathname}?page=${currentPage + 1}` : bookUrl
    return { bookUrl, pageUrl }
  }

  const handleShareClick = (platform: 'twitter' | 'facebook') => {
    // In scroll mode, share directly without showing menu
    if (!isPagination) {
      handleShareOption(platform, 'book')
      return
    }
    // In pagination mode, toggle dropdown menu
    if (shareMenuOpen === platform) {
      setShareMenuOpen(null)
    } else {
      setShareMenuOpen(platform)
    }
  }

  const handleShareOption = (platform: 'twitter' | 'facebook', shareType: 'book' | 'page') => {
    const { bookUrl, pageUrl } = getShareUrls()
    const url = shareType === 'book' ? bookUrl : pageUrl
    const text = shareType === 'book'
      ? `Reading "${book.title}" by ${book.author}`
      : `Reading "${book.title}" by ${book.author} - Page ${currentPage + 1}`

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        '_blank'
      )
    } else if (platform === 'facebook') {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank'
      )
    }
    setShareMenuOpen(null)
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
            {onTitleClick ? (
              <button
                onClick={onTitleClick}
                className="text-xl font-bold truncate text-gray-900 dark:text-white hover:text-amber-700 dark:hover:text-sky-400 transition-colors text-left w-full"
              >
                {book.title}
              </button>
            ) : (
              <h1 className="text-xl font-bold truncate text-gray-900 dark:text-white">{book.title}</h1>
            )}
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
          {/* Share buttons with dropdown menus */}
          <div className="hidden sm:flex gap-2" ref={shareMenuRef}>
            {/* X (Twitter) Share Button */}
            <div className="relative">
              <button
                onClick={() => handleShareClick('twitter')}
                className="p-2 bg-black text-white rounded hover:bg-gray-800 transition-colors flex items-center justify-center"
                aria-label={t.reader.tweet}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              {/* Twitter Dropdown Menu */}
              {shareMenuOpen === 'twitter' && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => handleShareOption('twitter', 'book')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t.reader.shareThisBook}
                  </button>
                  {isPagination && (
                    <button
                      onClick={() => handleShareOption('twitter', 'page')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t.reader.shareThisPage}
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Facebook Share Button */}
            <div className="relative">
              <button
                onClick={() => handleShareClick('facebook')}
                className="p-2 bg-[#1877F2] text-white rounded hover:bg-[#166FE5] transition-colors flex items-center justify-center"
                aria-label={t.reader.share}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              {/* Facebook Dropdown Menu */}
              {shareMenuOpen === 'facebook' && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => handleShareOption('facebook', 'book')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t.reader.shareThisBook}
                  </button>
                  {isPagination && (
                    <button
                      onClick={() => handleShareOption('facebook', 'page')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t.reader.shareThisPage}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 bg-amber-100 dark:bg-gray-700 text-amber-900 dark:text-gray-200 rounded hover:bg-amber-200 dark:hover:bg-gray-600 transition-colors"
            aria-label={t.common.back}
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
