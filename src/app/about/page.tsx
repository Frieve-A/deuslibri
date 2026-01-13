'use client'

import { useI18n } from '@/lib/i18n'
import Header from '@/components/Header'

export default function AboutPage() {
  const { t } = useI18n()

  return (
    <>
      <Header />
      <main className="min-h-screen p-8 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto">

        <div className="bg-amber-50 dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-amber-200 dark:border-slate-700">
          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            {t.about.title}
          </h1>

          <div className="mb-8">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t.about.description}
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              {t.about.features.title}
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {t.about.features.items.map((item, index) => (
                <li key={index} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-6 border-t border-amber-300 dark:border-slate-700">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {t.about.operator}:{' '}
              <a
                href="https://frieve.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 dark:text-sky-400 hover:text-amber-900 dark:hover:text-sky-300 font-semibold underline transition"
              >
                {t.about.operatorName}
              </a>
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdQt9JNUrFAB-UajTlN6kKEJXSFIFRGSEl6YxY7LtNxR2mL7g/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 dark:text-sky-400 hover:text-amber-900 dark:hover:text-sky-300 font-semibold underline transition"
              >
                {t.about.contact}
              </a>
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              DeusLibri {t.about.version} 0.20
            </p>
          </div>
        </div>
      </div>
    </main>
    </>
  )
}
