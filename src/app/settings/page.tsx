'use client'

import { useReadingStore, type AutoScrollSettings, type FontFamily, type InteractionSettings } from '@/lib/stores/useReadingStore'
import { useState, useEffect, Suspense, type CSSProperties, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/lib/i18n'
import Header from '@/components/Header'
import { usePwaInstallPrompt } from '@/components/PwaInstallProvider'

type RangeStyle = CSSProperties & {
  '--range-progress': string
}

function getRangeStyle(value: number, min: number, max: number): RangeStyle {
  const progress = ((value - min) / (max - min)) * 100
  return {
    '--range-progress': `${Math.min(100, Math.max(0, progress))}%`,
  }
}

type SettingsOptionIconName =
  | 'pages'
  | 'scroll'
  | 'autoTheme'
  | 'sun'
  | 'moon'
  | 'sepia'
  | 'marginSmall'
  | 'marginMedium'
  | 'marginLarge'
  | 'fontSystem'
  | 'fontSerif'
  | 'fontSans'
  | 'fontMincho'
  | 'fontGothic'
  | 'writingHorizontal'
  | 'writingVertical'
  | 'pause'
  | 'autoResume'
  | 'languageEn'
  | 'languageJa'
  | 'language'

type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon: SettingsOptionIconName
}

const getVisibleFontFamily = (fontFamily: FontFamily, isEnglish: boolean): FontFamily => {
  if (!isEnglish) return fontFamily
  if (fontFamily === 'mincho') return 'serif'
  if (fontFamily === 'gothic') return 'sans-serif'
  return fontFamily
}

function IconShell({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function FontSampleIcon({
  children,
  fontFamily,
  fontSize,
}: {
  children: string
  fontFamily: string
  fontSize: number
}) {
  return (
    <svg
      className="h-7 w-8 flex-shrink-0"
      fill="none"
      viewBox="0 0 32 24"
      aria-hidden="true"
    >
      <text
        x="16"
        y="18"
        fill="currentColor"
        fontFamily={fontFamily}
        fontSize={fontSize}
        fontWeight="700"
        stroke="none"
        textAnchor="middle"
      >
        {children}
      </text>
    </svg>
  )
}

function SettingsOptionIcon({ name }: { name: SettingsOptionIconName }) {
  switch (name) {
    case 'pages':
      return (
        <IconShell>
          <path d="M6 4.5h8.5a2 2 0 0 1 2 2V19" />
          <path d="M4.5 7h9a2 2 0 0 1 2 2v10.5h-9a2 2 0 0 1-2-2V7z" />
          <path d="M8 11h4" />
          <path d="M8 14h3" />
        </IconShell>
      )
    case 'scroll':
      return (
        <IconShell>
          <path d="M7 4h10v16H7z" />
          <path d="M12 8v8" />
          <path d="m9.5 13.5 2.5 2.5 2.5-2.5" />
        </IconShell>
      )
    case 'autoTheme':
      return (
        <IconShell>
          <path d="M4 5h16v11H4z" />
          <path d="M9 20h6" />
          <path d="M12 16v4" />
          <path d="M8 10a4 4 0 0 1 6.5-3.1" />
          <path d="M15 5.5v3h-3" />
        </IconShell>
      )
    case 'sun':
      return (
        <IconShell>
          <path d="M12 4V2.5" />
          <path d="M12 21.5V20" />
          <path d="M4 12H2.5" />
          <path d="M21.5 12H20" />
          <path d="m6.2 6.2-1-1" />
          <path d="m18.8 18.8-1-1" />
          <path d="m17.8 6.2 1-1" />
          <path d="m5.2 18.8 1-1" />
          <circle cx="12" cy="12" r="4" />
        </IconShell>
      )
    case 'moon':
      return (
        <IconShell>
          <path d="M18.5 15.5A7.5 7.5 0 0 1 8.5 5.5 7.5 7.5 0 1 0 18.5 15.5z" />
        </IconShell>
      )
    case 'sepia':
      return (
        <IconShell>
          <path d="M7 4h8l3 3v13H7z" />
          <path d="M15 4v4h3" />
          <path d="M10 12h5" />
          <path d="M10 15h4" />
        </IconShell>
      )
    case 'marginSmall':
      return (
        <IconShell>
          <path d="M5 5h14v14H5z" />
          <path d="M8 8h8v8H8z" />
        </IconShell>
      )
    case 'marginMedium':
      return (
        <IconShell>
          <path d="M5 5h14v14H5z" />
          <path d="M9 9h6v6H9z" />
        </IconShell>
      )
    case 'marginLarge':
      return (
        <IconShell>
          <path d="M5 5h14v14H5z" />
          <path d="M10 10h4v4h-4z" />
        </IconShell>
      )
    case 'fontSystem':
      return (
        <IconShell>
          <path d="M4 5h16v11H4z" />
          <path d="M9 20h6" />
          <path d="M12 16v4" />
          <path d="M9 13 12 8l3 5" />
          <path d="M10.2 11.5h3.6" />
        </IconShell>
      )
    case 'fontSerif':
      return (
        <FontSampleIcon
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={18}
        >
          Aa
        </FontSampleIcon>
      )
    case 'fontSans':
      return (
        <FontSampleIcon
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={18}
        >
          Aa
        </FontSampleIcon>
      )
    case 'fontMincho':
      return (
        <FontSampleIcon
          fontFamily="'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif CJK JP', serif"
          fontSize={19}
        >
          永
        </FontSampleIcon>
      )
    case 'fontGothic':
      return (
        <FontSampleIcon
          fontFamily="'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', sans-serif"
          fontSize={19}
        >
          永
        </FontSampleIcon>
      )
    case 'writingHorizontal':
      return (
        <IconShell>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h10" />
        </IconShell>
      )
    case 'writingVertical':
      return (
        <IconShell>
          <path d="M7 5v14" />
          <path d="M12 5v14" />
          <path d="M17 5v10" />
        </IconShell>
      )
    case 'pause':
      return (
        <IconShell>
          <path d="M8 5h3v14H8z" />
          <path d="M13 5h3v14h-3z" />
        </IconShell>
      )
    case 'autoResume':
      return (
        <IconShell>
          <path d="M8 5v14l10-7z" />
          <path d="M5 7a8 8 0 0 1 13.5 1" />
          <path d="M18.5 5v3.5H15" />
        </IconShell>
      )
    case 'languageEn':
      return (
        <IconShell>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
          <text
            x="12"
            y="14.5"
            fill="currentColor"
            fontSize="5"
            fontWeight="700"
            stroke="none"
            textAnchor="middle"
          >
            EN
          </text>
        </IconShell>
      )
    case 'languageJa':
      return (
        <IconShell>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
          <text
            x="12"
            y="14.5"
            fill="currentColor"
            fontSize="5"
            fontWeight="700"
            stroke="none"
            textAnchor="middle"
          >
            JA
          </text>
        </IconShell>
      )
    case 'language':
      return (
        <IconShell>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
        </IconShell>
      )
  }
}

function SegmentedButtonGroup<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  className = 'flex flex-wrap gap-2',
  optionClassName = 'min-w-[8.5rem] flex-1 basis-32',
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  ariaLabel: string
  className?: string
  optionClassName?: string
}) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => {
              if (!isSelected) {
                onChange(option.value)
              }
            }}
            className={`flex ${optionClassName} items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? 'border-amber-950 bg-amber-800 text-white shadow-md ring-2 ring-amber-300/80 dark:border-sky-100 dark:bg-sky-300 dark:text-slate-950 dark:ring-sky-300/50'
                : 'border-gray-300 bg-white text-gray-900 hover:bg-amber-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-slate-600 ui-skin-button'
            }`}
          >
            <SettingsOptionIcon name={option.icon} />
            <span className="leading-snug">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function languageIconFor(lang: SupportedLanguage): SettingsOptionIconName {
  if (lang === 'en') return 'languageEn'
  if (lang === 'ja') return 'languageJa'
  return 'language'
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const { settings, updateSettings, exportData, importData } = useReadingStore()
  const { language, setLanguage, t, effectiveLanguage } = useI18n()
  const { canInstall, isInstalling, install } = usePwaInstallPrompt()
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isEnglishLanguage = effectiveLanguage === 'en'
  const visibleFontFamily = getVisibleFontFamily(settings.fontFamily, isEnglishLanguage)

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
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-500 ui-skin-button"
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
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.displaySettings}</h2>

            <div className="space-y-4">
              {/* Display Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.displayMode.label}
                </label>
                <SegmentedButtonGroup
                  value={settings.displayMode}
                  ariaLabel={t.settings.displayMode.label}
                  onChange={(displayMode) => updateSettings({ displayMode })}
                  options={[
                    {
                      value: 'pagination',
                      label: t.settings.displayMode.pagination,
                      icon: 'pages',
                    },
                    {
                      value: 'scroll',
                      label: t.settings.displayMode.scroll,
                      icon: 'scroll',
                    },
                  ]}
                />
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
                  style={getRangeStyle(settings.fontSize, 12, 32)}
                  onChange={(e) =>
                    updateSettings({ fontSize: parseInt(e.target.value) })
                  }
                  className="w-full ui-skin-range"
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
                  <span>{t.settings.fontSize.small}</span>
                  <span>{t.settings.fontSize.large}</span>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.theme.label}</label>
                <SegmentedButtonGroup
                  value={settings.theme}
                  ariaLabel={t.settings.theme.label}
                  onChange={(theme) => updateSettings({ theme })}
                  options={[
                    {
                      value: 'auto',
                      label: t.settings.theme.auto,
                      icon: 'autoTheme',
                    },
                    {
                      value: 'light',
                      label: t.settings.theme.light,
                      icon: 'sun',
                    },
                    {
                      value: 'dark',
                      label: t.settings.theme.dark,
                      icon: 'moon',
                    },
                    {
                      value: 'sepia',
                      label: t.settings.theme.sepia,
                      icon: 'sepia',
                    },
                  ]}
                />
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
                  style={getRangeStyle(settings.lineHeight ?? 1.8, 1, 3)}
                  onChange={(e) =>
                    updateSettings({ lineHeight: parseFloat(e.target.value) })
                  }
                  className="w-full ui-skin-range"
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
                  <span>{t.settings.lineHeight.compact}</span>
                  <span>{t.settings.lineHeight.spacious}</span>
                </div>
              </div>

              {/* Margin Size */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.marginSize.label}</label>
                <SegmentedButtonGroup
                  value={settings.marginSize ?? 'medium'}
                  ariaLabel={t.settings.marginSize.label}
                  onChange={(marginSize) => updateSettings({ marginSize })}
                  options={[
                    {
                      value: 'small',
                      label: t.settings.marginSize.small,
                      icon: 'marginSmall',
                    },
                    {
                      value: 'medium',
                      label: t.settings.marginSize.medium,
                      icon: 'marginMedium',
                    },
                    {
                      value: 'large',
                      label: t.settings.marginSize.large,
                      icon: 'marginLarge',
                    },
                  ]}
                />
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
                  style={getRangeStyle(settings.brightness ?? 100, 30, 100)}
                  onChange={(e) =>
                    updateSettings({ brightness: parseInt(e.target.value) })
                  }
                  className="w-full ui-skin-range"
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
                  <span>{t.settings.brightness.dim}</span>
                  <span>{t.settings.brightness.bright}</span>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t.settings.fontFamily.label}</label>
                <SegmentedButtonGroup
                  value={visibleFontFamily}
                  ariaLabel={t.settings.fontFamily.label}
                  onChange={(fontFamily) => updateSettings({ fontFamily })}
                  className={`grid grid-cols-1 gap-2 ${isEnglishLanguage ? 'sm:grid-cols-3' : 'sm:grid-cols-5'}`}
                  optionClassName="min-w-0 flex-col"
                  options={[
                    {
                      value: 'system',
                      label: t.settings.fontFamily.system,
                      icon: 'fontSystem',
                    },
                    {
                      value: 'serif',
                      label: t.settings.fontFamily.serif,
                      icon: 'fontSerif',
                    },
                    {
                      value: 'sans-serif',
                      label: t.settings.fontFamily.sansSerif,
                      icon: 'fontSans',
                    },
                    ...(!isEnglishLanguage
                      ? [
                          {
                            value: 'mincho' as const,
                            label: t.settings.fontFamily.mincho,
                            icon: 'fontMincho' as const,
                          },
                          {
                            value: 'gothic' as const,
                            label: t.settings.fontFamily.gothic,
                            icon: 'fontGothic' as const,
                          },
                        ]
                      : []),
                  ]}
                />
                {!isEnglishLanguage && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t.settings.fontFamily.note}
                  </p>
                )}
              </div>

              {/* Writing Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.writingMode.label}
                </label>
                <SegmentedButtonGroup
                  value={settings.writingMode}
                  ariaLabel={t.settings.writingMode.label}
                  onChange={(writingMode) => updateSettings({ writingMode })}
                  options={[
                    {
                      value: 'horizontal',
                      label: t.settings.writingMode.horizontal,
                      icon: 'writingHorizontal',
                    },
                    {
                      value: 'vertical',
                      label: t.settings.writingMode.vertical,
                      icon: 'writingVertical',
                    },
                  ]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t.settings.writingMode.note}
                </p>
              </div>
            </div>
          </section>

          {/* Auto Scroll Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
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
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
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
                  style={getRangeStyle(settings.autoScroll?.speed ?? 30, 1, 100)}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, speed: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full ui-skin-range"
                  disabled={!settings.autoScroll?.enabled}
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
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
                  style={getRangeStyle(settings.autoScroll?.startDelay ?? 1000, 0, 10000)}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, startDelay: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full ui-skin-range"
                  disabled={!settings.autoScroll?.enabled}
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
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
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
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
                  style={getRangeStyle(settings.autoScroll?.autoPageTurnDelay ?? 3000, 1000, 30000)}
                  onChange={(e) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, autoPageTurnDelay: parseInt(e.target.value) } as AutoScrollSettings,
                    })
                  }
                  className="w-full ui-skin-range"
                  disabled={!settings.autoScroll?.enabled || settings.displayMode !== 'pagination' || !settings.autoScroll?.autoPageTurn}
                />
                <div className="flex justify-between text-xs text-gray-500 ui-skin-range-scale">
                  <span>{t.settings.autoScroll.autoPageTurnDelay.short}</span>
                  <span>{t.settings.autoScroll.autoPageTurnDelay.long}</span>
                </div>
              </div>

              {/* User Interaction Behavior */}
              <div className={settings.autoScroll?.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t.settings.autoScroll.userInteractionBehavior.label}
                </label>
                <SegmentedButtonGroup
                  value={settings.autoScroll?.userInteractionBehavior ?? 'pause'}
                  ariaLabel={t.settings.autoScroll.userInteractionBehavior.label}
                  disabled={!settings.autoScroll?.enabled}
                  onChange={(userInteractionBehavior) =>
                    updateSettings({
                      autoScroll: { ...settings.autoScroll, userInteractionBehavior } as AutoScrollSettings,
                    })
                  }
                  options={[
                    {
                      value: 'pause',
                      label: t.settings.autoScroll.userInteractionBehavior.pause,
                      icon: 'pause',
                    },
                    {
                      value: 'autoResume',
                      label: t.settings.autoScroll.userInteractionBehavior.autoResume,
                      icon: 'autoResume',
                    },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Interaction Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.interaction.title}</h2>

            <div className="space-y-4">
              {/* Enable Tap Scroll */}
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTapScroll"
                    checked={settings.interaction?.enableTapScroll ?? true}
                    onChange={(e) =>
                      updateSettings({
                        interaction: { ...settings.interaction, enableTapScroll: e.target.checked } as InteractionSettings,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
                  />
                  <label htmlFor="enableTapScroll" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.settings.interaction.enableTapScroll}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {t.settings.interaction.enableTapScrollNote}
                </p>
              </div>

              {/* Enable Tap Page Turn */}
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableTapPageTurn"
                    checked={settings.interaction?.enableTapPageTurn ?? true}
                    onChange={(e) =>
                      updateSettings({
                        interaction: { ...settings.interaction, enableTapPageTurn: e.target.checked } as InteractionSettings,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
                  />
                  <label htmlFor="enableTapPageTurn" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.settings.interaction.enableTapPageTurn}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {t.settings.interaction.enableTapPageTurnNote}
                </p>
              </div>

              {/* Enable Flick Scroll */}
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableFlickScroll"
                    checked={settings.interaction?.enableFlickScroll ?? true}
                    onChange={(e) =>
                      updateSettings({
                        interaction: { ...settings.interaction, enableFlickScroll: e.target.checked } as InteractionSettings,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
                  />
                  <label htmlFor="enableFlickScroll" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.settings.interaction.enableFlickScroll}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {t.settings.interaction.enableFlickScrollNote}
                </p>
              </div>

              {/* Enable Flick Page Turn */}
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableFlickPageTurn"
                    checked={settings.interaction?.enableFlickPageTurn ?? true}
                    onChange={(e) =>
                      updateSettings({
                        interaction: { ...settings.interaction, enableFlickPageTurn: e.target.checked } as InteractionSettings,
                      })
                    }
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 ui-skin-checkbox"
                  />
                  <label htmlFor="enableFlickPageTurn" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t.settings.interaction.enableFlickPageTurn}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {t.settings.interaction.enableFlickPageTurnNote}
                </p>
              </div>
            </div>
          </section>

          {/* Language Settings */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.language.label}</h2>

            <div>
              <SegmentedButtonGroup
                value={language}
                ariaLabel={t.settings.language.label}
                onChange={(nextLanguage) => setLanguage(nextLanguage)}
                options={SUPPORTED_LANGUAGES.map((lang) => ({
                  value: lang,
                  label: LANGUAGE_NAMES[lang],
                  icon: languageIconFor(lang),
                }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t.settings.language.note}
              </p>
            </div>
          </section>

          {/* Data Management */}
          <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.dataManagement.title}</h2>

            <div className="space-y-3">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-amber-700 dark:bg-sky-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 ui-skin-primary"
              >
                {t.settings.dataManagement.export}
              </button>

              <button
                onClick={() => setShowImport(!showImport)}
                className="w-full px-4 py-2 bg-amber-600 dark:bg-teal-600 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-teal-700 ui-skin-button"
              >
                {showImport ? t.settings.dataManagement.cancelImport : t.settings.dataManagement.import}
              </button>

              {showImport && (
                <div className="mt-3">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={t.settings.dataManagement.importPlaceholder}
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ui-skin-input"
                  />
                  <button
                    onClick={handleImport}
                    className="mt-2 w-full px-4 py-2 bg-amber-600 dark:bg-teal-600 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-teal-700 ui-skin-primary"
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

          {canInstall && (
            <section className="border border-amber-200 dark:border-gray-700 rounded-lg p-6 bg-amber-50 dark:bg-slate-800 shadow-sm ui-skin-panel">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t.settings.pwaInstall.title}</h2>

              <button
                onClick={install}
                disabled={isInstalling}
                className="w-full px-4 py-2 bg-amber-700 dark:bg-sky-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 ui-skin-primary"
              >
                {isInstalling ? t.settings.pwaInstall.installing : t.settings.pwaInstall.button}
              </button>
            </section>
          )}
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
