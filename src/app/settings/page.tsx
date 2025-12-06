'use client'

import { useReadingStore, type FontFamily, type UserInteractionBehavior, type AutoScrollSettings } from '@/lib/stores/useReadingStore'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/lib/i18n'
import Header from '@/components/Header'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
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
      <>
        <Header />
        <div className="min-h-screen p-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
      </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen p-8 bg-stone-100 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto">
        {returnTo && (
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-amber-700 dark:text-sky-400 hover:text-amber-900 dark:hover:text-sky-300 transition"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t.common.back}
            </button>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t.settings.title}</h1>

        <div className="space-y-6">
          {/* Display Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.displaySettings}</h2>

            <div className="space-y-4">
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
                      theme: e.target.value as 'light' | 'dark' | 'sepia' | 'auto',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="auto">{t.settings.theme.auto}</option>
                  <option value="light">{t.settings.theme.light}</option>
                  <option value="dark">{t.settings.theme.dark}</option>
                  <option value="sepia">{t.settings.theme.sepia}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.theme.note}
                </p>
              </div>

              {/* Line Height */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.lineHeight.label}: {settings.lineHeight?.toFixed(1) ?? '1.8'}
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={settings.lineHeight ?? 1.8}
                  onChange={(e) =>
                    updateSettings({ lineHeight: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.lineHeight.compact}</span>
                  <span>{t.settings.lineHeight.spacious}</span>
                </div>
              </div>

              {/* Margin Size */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.marginSize.label}</label>
                <select
                  value={settings.marginSize ?? 'medium'}
                  onChange={(e) =>
                    updateSettings({
                      marginSize: e.target.value as 'small' | 'medium' | 'large',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="small">{t.settings.marginSize.small}</option>
                  <option value="medium">{t.settings.marginSize.medium}</option>
                  <option value="large">{t.settings.marginSize.large}</option>
                </select>
              </div>

              {/* Brightness */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.brightness.label}: {settings.brightness ?? 100}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={settings.brightness ?? 100}
                  onChange={(e) =>
                    updateSettings({ brightness: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.brightness.dim}</span>
                  <span>{t.settings.brightness.bright}</span>
                </div>
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
            </div>
          </section>

          {/* Auto Scroll Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.autoScroll.title}</h2>

            <div className="space-y-4">
              {/* Enable Auto Scroll */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoScrollEnabled"
                  checked={settings.autoScroll?.enabled ?? false}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, enabled: e.target.checked } as AutoScrollSettings,
                    })
                  }
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="autoScrollEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.enabled}
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {t.settings.autoScroll.enabledNote}
              </p>

              {/* Scroll Speed */}
              <div className={settings.autoScroll?.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.speed.label}: {settings.autoScroll?.speed ?? 30}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settings.autoScroll?.speed ?? 30}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, speed: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full"
                  disabled={!settings.autoScroll?.enabled}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.autoScroll.speed.slow}</span>
                  <span>{t.settings.autoScroll.speed.fast}</span>
                </div>
              </div>

              {/* Start Delay */}
              <div className={settings.autoScroll?.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.startDelay.label}: {((settings.autoScroll?.startDelay ?? 1000) / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="500"
                  value={settings.autoScroll?.startDelay ?? 1000}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, startDelay: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full"
                  disabled={!settings.autoScroll?.enabled}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.autoScroll.startDelay.short}</span>
                  <span>{t.settings.autoScroll.startDelay.long}</span>
                </div>
              </div>

              {/* Auto Page Turn (only in pagination mode) */}
              <div className={settings.autoScroll?.enabled && settings.displayMode === 'pagination' ? '' : 'opacity-50 pointer-events-none'}>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoPageTurn"
                    checked={settings.autoScroll?.autoPageTurn ?? false}
                    onChange={(e) =>
                      updateSettings({
                        autoScroll: { ...settings.autoScroll, autoPageTurn: e.target.checked } as AutoScrollSettings,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
                    disabled={!settings.autoScroll?.enabled || settings.displayMode !== 'pagination'}
                  />
                  <label htmlFor="autoPageTurn" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.settings.autoScroll.autoPageTurn}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.autoScroll.autoPageTurnNote}
                </p>
              </div>

              {/* Auto Page Turn Delay */}
              <div className={settings.autoScroll?.enabled && settings.displayMode === 'pagination' && settings.autoScroll?.autoPageTurn ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.autoPageTurnDelay.label}: {((settings.autoScroll?.autoPageTurnDelay ?? 3000) / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={settings.autoScroll?.autoPageTurnDelay ?? 3000}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, autoPageTurnDelay: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full"
                  disabled={!settings.autoScroll?.enabled || settings.displayMode !== 'pagination' || !settings.autoScroll?.autoPageTurn}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.settings.autoScroll.autoPageTurnDelay.short}</span>
                  <span>{t.settings.autoScroll.autoPageTurnDelay.long}</span>
                </div>
              </div>

              {/* User Interaction Behavior */}
              <div className={settings.autoScroll?.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.userInteractionBehavior.label}
                </label>
                <select
                  value={settings.autoScroll?.userInteractionBehavior ?? 'pause'}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, userInteractionBehavior: e.target.value as UserInteractionBehavior } as AutoScrollSettings,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!settings.autoScroll?.enabled}
                >
                  <option value="pause">{t.settings.autoScroll.userInteractionBehavior.pause}</option>
                  <option value="autoResume">{t.settings.autoScroll.userInteractionBehavior.autoResume}</option>
                </select>
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
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className="min-h-screen p-8 bg-stone-100 dark:bg-slate-900">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </>
    }>
      <SettingsContent />
    </Suspense>
  )
}
