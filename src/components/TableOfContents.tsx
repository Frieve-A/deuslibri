'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TocItem } from '@/types/book'
import { Bookmark } from '@/lib/stores/useReadingStore'
import { useI18n } from '@/lib/i18n'

interface TableOfContentsProps {
  toc: TocItem[]
  currentPage: number
  onPageChange: (pageIndex: number) => void
  bookmarks?: Bookmark[]
  isOpen: boolean
  onToggle: () => void
  isScrollMode?: boolean
}

export default function TableOfContents({
  toc,
  currentPage,
  onPageChange,
  bookmarks = [],
  isOpen,
  onToggle,
  isScrollMode = false,
}: TableOfContentsProps) {
  const [showBookmarks, setShowBookmarks] = useState(false)
  const { t } = useI18n()

  if (toc.length === 0 && bookmarks.length === 0) {
    return null
  }

  return (
    <>
      {/* TOC Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-amber-50 dark:bg-slate-900 border-r border-amber-200 dark:border-slate-700 shadow-xl z-30 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {showBookmarks ? t.reader.bookmarks : t.reader.tableOfContents}
            </h2>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-amber-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              aria-label="Close table of contents"
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

          {/* Toggle between TOC and Bookmarks */}
          {bookmarks.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowBookmarks(false)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  !showBookmarks
                    ? 'bg-amber-700 dark:bg-sky-600 text-white'
                    : 'bg-amber-100 dark:bg-slate-800 text-amber-900 dark:text-gray-300'
                }`}
              >
                {t.reader.toc}
              </button>
              <button
                onClick={() => setShowBookmarks(true)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  showBookmarks
                    ? 'bg-amber-700 dark:bg-sky-600 text-white'
                    : 'bg-amber-100 dark:bg-slate-800 text-amber-900 dark:text-gray-300'
                }`}
              >
                {t.reader.bookmarks} ({bookmarks.length})
              </button>
            </div>
          )}

          {/* TOC Items */}
          <nav className="flex-1">
            {!showBookmarks ? (
              <ul className="space-y-1">
                {toc.map((item, index) => (
                  <li
                    key={`${item.id}-${index}`}
                    style={{
                      paddingLeft: `${(item.level - 1) * 0.75}rem`,
                    }}
                  >
                    <button
                      onClick={() => {
                        onPageChange(item.pageIndex)
                        onToggle()
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors ${
                        item.pageIndex === currentPage
                          ? 'bg-amber-200 dark:bg-slate-800 text-amber-900 dark:text-sky-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="line-clamp-2">{item.text}</span>
                      {item.level === 1 && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (p.{item.pageIndex + 1})
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {bookmarks.map((bookmark, index) => (
                  <li key={index}>
                    <button
                      onClick={() => {
                        onPageChange(bookmark.pageIndex)
                        onToggle()
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors ${
                        bookmark.pageIndex === currentPage
                          ? 'bg-amber-200 dark:bg-slate-800 text-amber-900 dark:text-sky-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🔖</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {t.reader.page} {bookmark.pageIndex + 1}
                          </div>
                          {bookmark.note && (
                            <div className="text-sm line-clamp-2">{bookmark.note}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          {/* Settings Link */}
          <div className="mt-6 pt-4 border-t border-amber-200 dark:border-slate-700">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
              onClick={onToggle}
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {t.common.settings}
            </Link>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={onToggle}
        />
      )}
    </>
  )
}
