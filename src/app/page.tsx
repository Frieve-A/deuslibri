import { getAllBooks } from '@/lib/books/loader'
import HomeClient from '@/components/HomeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DeusLibri - Free Digital Library',
  description: 'Discover and read free books online with DeusLibri. A beautiful digital library featuring classics, modern literature, and more with a customizable reading experience.',
  keywords: ['digital library', 'free books', 'ebooks', 'online reading', 'literature', 'classics', 'modern literature'],
  openGraph: {
    title: 'DeusLibri - Free Digital Library',
    description: 'Discover and read free books online with DeusLibri',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeusLibri - Free Digital Library',
    description: 'Discover and read free books online with DeusLibri',
  },
}

export default function HomePage() {
  const books = getAllBooks()

  return <HomeClient books={books} />
}
