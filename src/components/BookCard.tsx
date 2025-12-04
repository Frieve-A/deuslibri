'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookCatalogItem } from '@/types/book'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { useI18n } from '@/lib/i18n'
import { getContentImagePath } from '@/lib/utils/basePath'

interface BookCardProps {
  book: BookCatalogItem
}

export default function BookCard({ book }: BookCardProps) {
  const [mounted, setMounted] = useState(false)
  const { isFavorite, addFavorite, removeFavorite, getProgress, settings } =
    useReadingStore()
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  const favorite = mounted ? isFavorite(book.id, book.language) : false
  const progress = mounted ? getProgress(book.id, book.language) : null

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (favorite) {
      removeFavorite(book.id, book.language)
    } else {
      addFavorite(book.id, book.language)
    }
  }

  // Generate cover image path
  const coverImagePath = book.coverImage
    ? getContentImagePath(book.folderPath, book.coverImage)
    : null

  return (
    <Link
      href={`/book/${book.id}/${book.language}`}
      className="block border border-amber-200 dark:border-slate-700 rounded-lg overflow-hidden card-hover bg-amber-50 dark:bg-slate-800 animate-fadeIn"
    >
      {/* Cover Image */}
      {coverImagePath && (
        <div className="w-full aspect-[3/4] bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          <img
            src={coverImagePath}
            alt={`${book.title} cover`}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold line-clamp-2 flex-1 text-gray-900 dark:text-white">{book.title}</h3>
          <button
            onClick={handleFavoriteClick}
            className="text-2xl hover:scale-110 transition-transform ml-2 flex-shrink-0"
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favorite ? '❤️' : '🤍'}
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {book.author}
        </p>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
          {book.summary || book.description}
        </p>

        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded"
              >
                {tag}
              </span>
            ))}
            {book.tags.length > 3 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{book.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {progress && settings.displayMode === 'pagination' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t.catalog.progress}: {t.reader.page} {progress.currentPage + 1}
          </div>
        )}
        {progress && settings.displayMode === 'scroll' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t.catalog.progress}: {t.catalog.reading}
          </div>
        )}
      </div>
    </Link>
  )
}
