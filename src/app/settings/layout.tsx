import type { Metadata } from 'next'
import { getDefaultOgImages } from '@/lib/metadata'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Customize your reading experience on DeusLibri. Adjust display mode, font size, theme, writing mode, auto-scroll settings, and manage your reading data.',
  keywords: ['settings', 'reading settings', 'customization', 'preferences', 'display settings'],
  openGraph: {
    title: 'Settings | DeusLibri',
    description: 'Customize your reading experience on DeusLibri',
    type: 'website',
    images: getDefaultOgImages(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Settings | DeusLibri',
    description: 'Customize your reading experience on DeusLibri',
    images: getDefaultOgImages(),
  },
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
