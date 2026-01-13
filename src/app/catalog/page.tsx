import { getAllBooks } from '@/lib/books/loader'
import CatalogClient from '@/components/CatalogClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Catalog',
  description: 'Browse our complete collection of free books. Filter by genre, language, and author to find your next great read in DeusLibri\'s digital library.',
  keywords: ['book catalog', 'free books', 'ebook collection', 'digital library', 'browse books', 'literature'],
  openGraph: {
    title: 'Book Catalog | DeusLibri',
    description: 'Browse our complete collection of free books',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book Catalog | DeusLibri',
    description: 'Browse our complete collection of free books',
  },
}

export default function CatalogPage() {
  const books = getAllBooks()

  return <CatalogClient books={books} />
}
