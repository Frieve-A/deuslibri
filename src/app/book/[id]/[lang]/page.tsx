import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { findBookByIdAndLang, getAllBooks } from '@/lib/books/loader'
import BookReader from '@/components/BookReader'
import { getContentImagePath, getAbsoluteUrl } from '@/lib/utils/basePath'

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

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-xl">Loading...</p></div>}>
      <BookReader book={book} />
    </Suspense>
  )
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
    ? getContentImagePath(book.folderPath, book.coverImage)
    : null

  // OGP requires absolute URLs for images
  const ogImageUrl = coverImagePath ? getAbsoluteUrl(coverImagePath) : null

  return {
    title: `${book.title} - ${book.author} | DeusLibri`,
    description: book.description,
    keywords: book.tags.join(', '),
    authors: [{ name: book.author }],
    openGraph: {
      title: book.title,
      description: book.summary || book.description,
      type: 'book',
      images: ogImageUrl ? [ogImageUrl] : [],
      locale: lang,
    },
    twitter: {
      card: 'summary_large_image',
      title: book.title,
      description: book.summary || book.description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  }
}
