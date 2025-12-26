import { getAllBooks } from '@/lib/books/loader'
import HomeClient from '@/components/HomeClient'

export default function HomePage() {
  const books = getAllBooks()

  return <HomeClient books={books} />
}
