import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Customize your reading experience on DeusLibri. Adjust display mode, font size, theme, writing mode, auto-scroll settings, and manage your reading data.',
  keywords: ['settings', 'reading settings', 'customization', 'preferences', 'display settings'],
  openGraph: {
    title: 'Settings | DeusLibri',
    description: 'Customize your reading experience on DeusLibri',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Settings | DeusLibri',
    description: 'Customize your reading experience on DeusLibri',
  },
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
