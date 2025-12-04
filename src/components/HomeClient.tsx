'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useEffect, useState } from 'react'

export default function HomeClient() {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state until hydration is complete
  if (!mounted) {
    return (
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
    )
  }

  return (
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
          <div className="flex gap-4 justify-center">
            <Link
              href="/catalog"
              className="inline-block px-8 py-4 bg-amber-700 dark:bg-sky-600 text-white text-lg rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 transition shadow-lg"
            >
              {t.home.browseCatalog}
            </Link>
            <Link
              href="/settings"
              className="inline-block px-8 py-4 bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-white text-lg rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700 transition shadow-lg border border-amber-300 dark:border-slate-600"
            >
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
    </main>
  )
}
