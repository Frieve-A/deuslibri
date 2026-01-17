'use client'

import { useSearchParams } from 'next/navigation'
import BookReader from '@/components/BookReader'
import { Book } from '@/types/book'

interface BookReaderWrapperProps {
  book: Book
}

export default function BookReaderWrapper({ book }: BookReaderWrapperProps) {
  const searchParams = useSearchParams()
  const disableMath = searchParams.get('nomath') === '1'

  return <BookReader book={book} disableMath={disableMath} />
}
