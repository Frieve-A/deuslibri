'use client'

import { useReadingStore, type FontFamily } from '@/lib/stores/useReadingStore'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/lib/i18n'

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings, exportData, importData } = useReadingStore()
  const { language, setLanguage, t } = useI18n()
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deuslibri-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      importData(importText)
      setImportText('')
      setShowImport(false)
      alert(t.settings.dataManagement.importSuccess)
    } catch (error) {
      alert(t.settings.dataManagement.importError)
    }
  }

  // Show loading state until hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-stone-100 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.settings.title}</h1>
          <button
            onClick={() => router.back()}
            className="text-amber-700 dark:text-sky-400 hover:underline"
          >
            ← {t.common.back}
          </button>
        </div>

        <div className="space-y-6">
          {/* Display Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.displaySettings}</h2>

            <div className="space-y-4">
              {/* Writing Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.writingMode.label}
                </label>
                <select
                  value={settings.writingMode}
                  onChange={(e) =>
                    updateSettings({
                      writingMode: e.target.value as 'horizontal' | 'vertical',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="horizontal">{t.settings.writingMode.horizontal}</option>
                  <option value="vertical">{t.settings.writingMode.vertical}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.writingMode.note}
                </p>
              </div>

              {/* Display Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.displayMode.label}
                </label>
                <select
                  value={settings.displayMode}
                  onChange={(e) =>
                    updateSettings({
                      displayMode: e.target.value as 'pagination' | 'scroll',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="pagination">{t.settings.displayMode.pagination}</option>
                  <option value="scroll">{t.settings.displayMode.scroll}</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.fontSize.label}: {settings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={settings.fontSize}
                  onChange={(e) =>
                    updateSettings({ fontSize: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.fontSize.small}</span>
                  <span>{t.settings.fontSize.large}</span>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.theme.label}</label>
                <select
                  value={settings.theme}
                  onChange={(e) =>
                    updateSettings({
                      theme: e.target.value as 'light' | 'dark' | 'auto',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="auto">{t.settings.theme.auto}</option>
                  <option value="light">{t.settings.theme.light}</option>
                  <option value="dark">{t.settings.theme.dark}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.theme.note}
                </p>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.fontFamily.label}</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) =>
                    updateSettings({
                      fontFamily: e.target.value as FontFamily,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="system">{t.settings.fontFamily.system}</option>
                  <option value="serif">{t.settings.fontFamily.serif}</option>
                  <option value="sans-serif">{t.settings.fontFamily.sansSerif}</option>
                  <option value="mincho">{t.settings.fontFamily.mincho}</option>
                  <option value="gothic">{t.settings.fontFamily.gothic}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.fontFamily.note}
                </p>
              </div>
            </div>
          </section>

          {/* Language Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.language.label}</h2>

            <div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_NAMES[lang]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {t.settings.language.note}
              </p>
            </div>
          </section>

          {/* Data Management */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.dataManagement.title}</h2>

            <div className="space-y-3">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-amber-700 dark:bg-sky-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700"
              >
                {t.settings.dataManagement.export}
              </button>

              <button
                onClick={() => setShowImport(!showImport)}
                className="w-full px-4 py-2 bg-amber-600 dark:bg-teal-600 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-teal-700"
              >
                {showImport ? t.settings.dataManagement.cancelImport : t.settings.dataManagement.import}
              </button>

              {showImport && (
                <div className="mt-3">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={t.settings.dataManagement.importPlaceholder}
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleImport}
                    className="mt-2 w-full px-4 py-2 bg-amber-600 dark:bg-teal-600 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-teal-700"
                  >
                    {t.settings.dataManagement.import}
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              {t.settings.dataManagement.note}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
