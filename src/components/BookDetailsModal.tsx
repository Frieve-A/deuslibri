'use client'

import { useEffect, useCallback, useState } from 'react'
import { BookCatalogItem } from '@/types/book'
import { useI18n } from '@/lib/i18n'
import { getContentImagePath } from '@/lib/utils/basePath'
import { LANGUAGE_NAMES, SupportedLanguage } from '@/lib/i18n'

interface BookDetailsModalProps {
  book: BookCatalogItem | null
  isOpen: boolean
  onClose: () => void
}

export default function BookDetailsModal({ book, isOpen, onClose }: BookDetailsModalProps) {
  const { t } = useI18n()
  const [isAiUsageHintOpen, setIsAiUsageHintOpen] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    setIsAiUsageHintOpen(false)
  }, [isOpen, book?.id, book?.language])

  if (!isOpen || !book) return null

  const coverImagePath = book.coverImage
    ? getContentImagePath(book.folderPath, book.coverImage)
    : null

  const languageName =
    LANGUAGE_NAMES[book.language as SupportedLanguage] || book.language
  const hasAiUsage = book.aiUsage === true || book.aiUsage === 'ai_generated'
  const hasOther = Boolean(book.donationLink || book.purchaseLink || hasAiUsage)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ui-skin-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-amber-200 dark:border-slate-700 p-4 flex justify-between items-center ui-skin-chrome">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.bookDetails.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors ui-skin-icon"
            aria-label={t.bookDetails.close}
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {book.title}
            </h3>
            {book.subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                {book.subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover Image */}
            {coverImagePath && (
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <img
                  src={coverImagePath}
                  alt={`${book.title} cover`}
                  className="w-48 h-auto rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 space-y-4">
              {/* Author */}
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.bookDetails.author}
                </span>
                <p className="text-gray-900 dark:text-white">{book.author}</p>
              </div>

              {/* Language */}
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.bookDetails.language}
                </span>
                <p className="text-gray-900 dark:text-white">{languageName}</p>
              </div>

              {/* Publish Date */}
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.bookDetails.publishDate}
                </span>
                <p className="text-gray-900 dark:text-white">{book.publishDate}</p>
              </div>

              {/* Other */}
              {hasOther && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t.bookDetails.other}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {book.donationLink && (
                      <a
                        href={book.donationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded ui-skin-pill hover:bg-amber-300 dark:hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-400"
                      >
                        {t.bookDetails.donation}
                      </a>
                    )}
                    {book.purchaseLink && (
                      <a
                        href={book.purchaseLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded ui-skin-pill hover:bg-amber-300 dark:hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-400"
                      >
                        {t.bookDetails.printBook}
                      </a>
                    )}
                    {hasAiUsage && (
                      <div
                        className="relative inline-flex"
                        onMouseEnter={() => setIsAiUsageHintOpen(true)}
                        onMouseLeave={() => setIsAiUsageHintOpen(false)}
                      >
                        <button
                          type="button"
                          onClick={() => setIsAiUsageHintOpen(true)}
                          onFocus={() => setIsAiUsageHintOpen(true)}
                          onBlur={() => setIsAiUsageHintOpen(false)}
                          aria-describedby={isAiUsageHintOpen ? 'ai-usage-hint' : undefined}
                          className="text-sm px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded ui-skin-pill cursor-help focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-400"
                        >
                          {t.bookDetails.aiUsage}
                        </button>
                        {isAiUsageHintOpen && (
                          <div
                            id="ai-usage-hint"
                            role="tooltip"
                            className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[80vw] rounded-md border border-amber-200 bg-white p-3 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
                          >
                            {t.bookDetails.aiUsageHint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {book.tags.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t.bookDetails.tags}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {book.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-sm px-2 py-1 bg-amber-200 dark:bg-sky-900 text-amber-800 dark:text-sky-200 rounded ui-skin-pill"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {book.summary && (
            <div className="mt-6">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t.bookDetails.summary}
              </span>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{book.summary}</p>
            </div>
          )}

          {/* Description */}
          {book.description && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t.bookDetails.description}
              </span>
              <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-line">{book.description}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-amber-700 dark:bg-sky-600 text-white rounded-lg hover:bg-amber-800 dark:hover:bg-sky-700 transition-colors font-medium ui-skin-primary"
            >
              {t.bookDetails.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
