'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useState, useMemo } from 'react'
import HelpModal from './HelpModal'
import Header from './Header'
import { BookCatalogItem } from '@/types/book'
import { getContentImagePath } from '@/lib/utils/basePath'

interface HomeClientProps {
  books: BookCatalogItem[]
}

export default function HomeClient({ books }: HomeClientProps) {
  const { t, effectiveLanguage } = useI18n()
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Sort books with user's preferred language as highest priority, English as secondary
  // Same logic as CatalogClient to ensure consistency
  const newBooks = useMemo(() => {
    return [...books]
      .sort((a, b) => {
        // Language priority: User's preferred language > English > Others
        const getLanguagePriority = (lang: string) => {
          if (lang === effectiveLanguage) return 2 // User's preferred language: highest priority
          if (lang === 'en') return 1 // English: secondary priority
          return 0 // Other languages: lowest priority
        }

        const aPriority = getLanguagePriority(a.language)
        const bPriority = getLanguagePriority(b.language)

        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        // Secondary sort: Publication date (newest first)
        const dateA = new Date(a.publishDate).getTime()
        const dateB = new Date(b.publishDate).getTime()
        if (dateA !== dateB) {
          return dateB - dateA
        }

        // Tertiary sort: Book title alphabetically
        return a.title.localeCompare(b.title, effectiveLanguage)
      })
      .slice(0, 3)
  }, [books, effectiveLanguage])

  return (
    <>
      <Header />
      <main className="min-h-screen p-8 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-20">
          <h1 className="text-6xl font-bold mb-4 text-gray-900 dark:text-white">
            {t.home.title}
          </h1>
          <p className="text-2xl mb-8 text-gray-700 dark:text-gray-300">
            {t.home.subtitle}
          </p>
          <p className="text-lg mb-12 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t.home.description}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/catalog"
              className="inline-block px-8 py-4 bg-amber-700 dark:bg-sky-600 text-white text-lg rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 transition shadow-lg"
            >
              {t.home.browseCatalog}
            </Link>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-white text-lg rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700 transition shadow-lg border border-amber-300 dark:border-slate-600"
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t.help.title}
            </button>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-white text-lg rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700 transition shadow-lg border border-amber-300 dark:border-slate-600"
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

        {/* New Books Section */}
        {newBooks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t.home.newBooks}
            </h2>
            <div className="flex flex-col gap-6">
              {newBooks.map((book) => {
                const coverImagePath = book.coverImage
                  ? getContentImagePath(book.folderPath, book.coverImage)
                  : null

                return (
                  <Link
                    key={`${book.id}-${book.language}`}
                    href={`/book/${book.id}/${book.language}`}
                    className="block bg-amber-50 dark:bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-amber-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
                  >
                    {/* Desktop: Horizontal layout / Mobile: Vertical layout */}
                    <div className="flex flex-col sm:flex-row">
                      {/* Cover Image */}
                      {coverImagePath && (
                        <div className="sm:w-32 sm:h-44 sm:flex-shrink-0 w-full aspect-[3/4] sm:aspect-auto bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          <img
                            src={coverImagePath}
                            alt={`${book.title} cover`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="p-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {book.title}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                            ({book.publishDate})
                          </span>
                        </h3>
                        {book.summary && book.summary !== book.title && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
                            {book.summary}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          {book.author}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {book.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {t.home.featuresTitle}
          </h2>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">{t.home.features.freeBooks.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.features.freeBooks.description}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
              <div className="text-4xl mb-4">💾</div>
              <h3 className="text-xl font-semibold mb-2">{t.home.features.saveProgress.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.features.saveProgress.description}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">{t.home.features.customizable.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t.home.features.customizable.description}
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-20 pt-8 border-t border-amber-300 dark:border-slate-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Frieve (c) 2025 all rights reserved
          </p>
        </footer>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </main>
    </>
  )
}
