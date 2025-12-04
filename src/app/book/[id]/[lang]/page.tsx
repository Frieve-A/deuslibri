import { notFound } from 'next/navigation'
import { findBookByIdAndLang, getAllBooks } from '@/lib/books/loader'
import BookReader from '@/components/BookReader'

interface BookPageProps {
  params: Promise<{
    id: string
    lang: string
  }>
}

export async function generateStaticParams() {
  const books = getAllBooks()

  return books.map((book) => ({
    id: book.id,
    lang: book.language,
  }))
}

export default async function BookPage({ params }: BookPageProps) {
  const { id, lang } = await params
  const book = findBookByIdAndLang(id, lang)

  if (!book) {
    notFound()
  }

  return <BookReader book={book} />
}

export async function generateMetadata({ params }: BookPageProps) {
  const { id, lang } = await params
  const book = findBookByIdAndLang(id, lang)

  if (!book) {
    return {
      title: 'Book Not Found',
    }
  }

  const coverImagePath = book.coverImage
    ? `/content/books/${book.folderPath.replace(/\\/g, '/').split('content/books/')[1]}/${book.coverImage.replace(/^\.\//, '')}`
    : null

  return {
    title: `${book.title} - ${book.author} | DeusLibri`,
    description: book.description,
    keywords: book.tags.join(', '),
    authors: [{ name: book.author }],
    openGraph: {
      title: book.title,
      description: book.summary || book.description,
      type: 'book',
      images: coverImagePath ? [coverImagePath] : [],
      locale: lang,
    },
    twitter: {
      card: 'summary_large_image',
      title: book.title,
      description: book.summary || book.description,
      images: coverImagePath ? [coverImagePath] : [],
    },
  }
}
