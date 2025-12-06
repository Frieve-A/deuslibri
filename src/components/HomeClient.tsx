'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import HelpModal from './HelpModal'
import Header from './Header'

export default function HomeClient() {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state until hydration is complete
  if (!mounted) {
    return (
      <>
        <Header />
        <main className="min-h-screen p-8 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-20">
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-8"></div>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto mb-12"></div>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

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

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">{t.home.features.freeBooks.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t.home.features.freeBooks.description}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
            <div className="text-4xl mb-4">💾</div>
            <h2 className="text-xl font-semibold mb-2">{t.home.features.saveProgress.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t.home.features.saveProgress.description}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-slate-800 p-6 rounded-lg shadow border border-amber-200 dark:border-slate-700">
            <div className="text-4xl mb-4">🎨</div>
            <h2 className="text-xl font-semibold mb-2">{t.home.features.customizable.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t.home.features.customizable.description}
            </p>
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
