import type { Metadata } from 'next'
import { getDefaultOgImages } from '@/lib/metadata'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about DeusLibri - a free digital library platform offering a beautiful reading experience with customizable features for online book reading.',
  keywords: ['about', 'DeusLibri', 'digital library', 'free books', 'reading platform'],
  openGraph: {
    title: 'About | DeusLibri',
    description: 'Learn more about DeusLibri - a free digital library platform',
    type: 'website',
    images: getDefaultOgImages(),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About | DeusLibri',
    description: 'Learn more about DeusLibri - a free digital library platform',
    images: getDefaultOgImages(),
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
