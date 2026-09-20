'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { detectBrowserLanguage, useI18nStore } from '@/lib/i18n'

function getUILanguage() {
  const { language } = useI18nStore.getState()
  return language === 'default' ? detectBrowserLanguage() : language
}

// Non-book pages are exported in English before the browser preference is known.
const getServerUILanguage = () => 'en'

export default function DocumentRoot({ children }: { children: ReactNode }) {
  // useParams exposes the complete route during static rendering too, unlike
  // the server root layout's params, which only include ancestor segments.
  const { lang } = useParams<{ lang?: string }>()
  const uiLanguage = useSyncExternalStore(
    useI18nStore.subscribe,
    getUILanguage,
    getServerUILanguage
  )

  return <html lang={lang || uiLanguage}>{children}</html>
}
