'use client'

import { RefObject } from 'react'
import { TranslationMessages } from '@/lib/i18n'

interface PageNavigationProps {
  currentPage: number
  totalPages: number
  isVertical: boolean
  progressBarRef: RefObject<HTMLDivElement | null>
  goToNextPage: () => void
  goToPrevPage: () => void
  handleProgressBarMouseDown: (e: React.MouseEvent) => void
  onPageIndicatorClick: () => void
  t: TranslationMessages
}

export function PageNavigation({
  currentPage,
  totalPages,
  isVertical,
  progressBarRef,
  goToNextPage,
  goToPrevPage,
  handleProgressBarMouseDown,
  onPageIndicatorClick,
  t,
}: PageNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-amber-50 dark:bg-slate-800 border-t border-amber-200 dark:border-gray-700 shadow-lg z-10">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <button
            onClick={isVertical ? goToNextPage : goToPrevPage}
            disabled={isVertical ? currentPage === totalPages - 1 : currentPage === 0}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-amber-700 dark:bg-sky-600 text-white rounded disabled:bg-stone-300 dark:disabled:bg-slate-600 disabled:text-stone-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-amber-800 dark:hover:bg-sky-700 transition font-medium"
          >
            ← {isVertical ? t.reader.next : t.reader.prev}
          </button>

          <button
            onClick={onPageIndicatorClick}
            className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium hover:text-amber-700 dark:hover:text-sky-400 transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">{t.reader.page} </span>
            {currentPage + 1} / {totalPages}
          </button>

          <button
            onClick={isVertical ? goToPrevPage : goToNextPage}
            disabled={isVertical ? currentPage === 0 : currentPage === totalPages - 1}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-amber-700 dark:bg-sky-600 text-white rounded disabled:bg-stone-300 dark:disabled:bg-slate-600 disabled:text-stone-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-amber-800 dark:hover:bg-sky-700 transition font-medium"
          >
            {isVertical ? t.reader.prev : t.reader.next} →
          </button>
        </div>

        {/* Progress Bar - Draggable */}
        <div
          ref={progressBarRef}
          className="mt-2 w-full bg-amber-200 dark:bg-slate-600 rounded-full h-3 cursor-pointer relative select-none"
          style={{ touchAction: 'none' }}
          onMouseDown={handleProgressBarMouseDown}
        >
          <div
            className="bg-amber-600 dark:bg-sky-500 h-3 rounded-full pointer-events-none"
            style={{
              width: `${(currentPage / (totalPages - 1)) * 100}%`,
              marginLeft: isVertical ? 'auto' : undefined,
            }}
          />
          {/* Drag handle indicator */}
          <div
            className="absolute w-5 h-5 bg-amber-600 dark:bg-sky-500 rounded-full shadow-md border-2 border-white pointer-events-none"
            style={{
              left: isVertical
                ? `${100 - (currentPage / (totalPages - 1)) * 100}%`
                : `${(currentPage / (totalPages - 1)) * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
