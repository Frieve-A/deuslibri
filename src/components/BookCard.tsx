'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { BookCatalogItem } from '@/types/book'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { useI18n } from '@/lib/i18n'
import { getContentImagePath } from '@/lib/utils/basePath'

interface BookCardProps {
  book: BookCatalogItem
  onDetailsClick?: (book: BookCatalogItem) => void
}

export default function BookCard({ book, onDetailsClick }: BookCardProps) {
  const [mounted, setMounted] = useState(false)
  const tagRowRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleTagCount, setVisibleTagCount] = useState(0)
  const { isFavorite, addFavorite, removeFavorite, getProgress, settings } =
    useReadingStore()
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  const favorite = mounted ? isFavorite(book.id, book.language) : false
  const progress = mounted ? getProgress(book.id, book.language) : null
  const cardTagClassName =
    'text-xs px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded ui-skin-pill flex-shrink-0 whitespace-nowrap'

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (favorite) {
      removeFavorite(book.id, book.language)
    } else {
      addFavorite(book.id, book.language)
    }
  }

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onDetailsClick?.(book)
  }

  // Generate cover image path
  const coverImagePath = book.coverImage
    ? getContentImagePath(book.folderPath, book.coverImage)
    : null

  useEffect(() => {
    const row = tagRowRef.current
    const measure = measureRef.current
    if (!row || !measure || book.tags.length === 0) return

    const calculateVisibleTags = () => {
      const availableWidth = row.clientWidth
      if (availableWidth <= 0) return

      const tagNodes = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-measure-card-tag]')
      )
      const gap = parseFloat(window.getComputedStyle(row).columnGap || '0') || 0
      const moreNodes = new Map(
        Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-card-more]')).map((node) => [
          Number(node.dataset.hiddenCount),
          node.offsetWidth,
        ])
      )

      let nextVisibleCount = 0

      for (let count = book.tags.length; count >= 0; count -= 1) {
        const hiddenCount = book.tags.length - count
        const visibleWidth = tagNodes
          .slice(0, count)
          .reduce((total, tagNode) => total + tagNode.offsetWidth, 0)
        const visibleGaps = count > 1 ? (count - 1) * gap : 0
        const moreWidth = hiddenCount > 0 ? moreNodes.get(hiddenCount) ?? 0 : 0
        const moreGap = hiddenCount > 0 && count > 0 ? gap : 0
        const totalWidth = visibleWidth + visibleGaps + moreGap + moreWidth

        if (totalWidth <= availableWidth) {
          nextVisibleCount = count
          break
        }
      }

      setVisibleTagCount(nextVisibleCount)
    }

    calculateVisibleTags()

    const resizeObserver = new ResizeObserver(calculateVisibleTags)
    resizeObserver.observe(row)

    return () => resizeObserver.disconnect()
  }, [book.tags, t.catalog.moreCount])

  const visibleTags = useMemo(
    () => book.tags.slice(0, visibleTagCount),
    [book.tags, visibleTagCount]
  )
  const hiddenTagCount = book.tags.length - visibleTags.length

  return (
    <Link
      href={`/book/${book.id}/${book.language}`}
      className="flex h-full flex-col border border-amber-200 dark:border-slate-700 rounded-lg overflow-hidden card-hover bg-amber-50 dark:bg-slate-800 animate-fadeIn ui-skin-panel"
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

      <div className="p-4 flex flex-1 flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold line-clamp-2 flex-1 text-gray-900 dark:text-white">{book.title}</h3>
          <button
            onClick={handleFavoriteClick}
            className="text-2xl hover:scale-110 transition-transform ml-2 flex-shrink-0 ui-skin-quiet-emoji"
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={favorite}
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
          <>
            <div ref={tagRowRef} className="flex flex-nowrap gap-1 mb-2 overflow-hidden">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className={cardTagClassName}
                >
                  {tag}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <span className="text-xs px-2 py-1 text-gray-500 flex-shrink-0 whitespace-nowrap">
                  +{hiddenTagCount}
                </span>
              )}
            </div>
            <div
              ref={measureRef}
              className="absolute left-0 top-0 h-0 overflow-hidden opacity-0 pointer-events-none whitespace-nowrap"
              aria-hidden="true"
            >
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  data-measure-card-tag
                  className={cardTagClassName}
                >
                  {tag}
                </span>
              ))}
              {Array.from({ length: book.tags.length }, (_, index) => index + 1).map((hiddenCount) => (
                <span
                  key={hiddenCount}
                  data-measure-card-more
                  data-hidden-count={hiddenCount}
                  className="text-xs px-2 py-1 text-gray-500 whitespace-nowrap"
                >
                  +{hiddenCount}
                </span>
              ))}
            </div>
          </>
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

        {/* Details Link */}
        {onDetailsClick && (
          <button
            onClick={handleDetailsClick}
            className="mt-auto self-end inline-flex items-center rounded border border-amber-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-slate-100 hover:bg-amber-100 dark:hover:bg-slate-700 ui-skin-button"
          >
            {t.bookDetails.details} →
          </button>
        )}
      </div>
    </Link>
  )
}
