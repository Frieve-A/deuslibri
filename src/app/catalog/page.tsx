import { getAllBooks } from '@/lib/books/loader'
import CatalogClient from '@/components/CatalogClient'

export default function CatalogPage() {
  const books = getAllBooks()

  return <CatalogClient books={books} />
}
