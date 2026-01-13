import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about DeusLibri - a free digital library platform offering a beautiful reading experience with customizable features for online book reading.',
  keywords: ['about', 'DeusLibri', 'digital library', 'free books', 'reading platform'],
  openGraph: {
    title: 'About | DeusLibri',
    description: 'Learn more about DeusLibri - a free digital library platform',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About | DeusLibri',
    description: 'Learn more about DeusLibri - a free digital library platform',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
