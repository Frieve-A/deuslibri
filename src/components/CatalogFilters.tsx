'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface CatalogFiltersProps {
  allTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function CatalogFilters({
  allTags,
  selectedTags,
  onTagsChange,
  searchQuery,
  onSearchChange,
}: CatalogFiltersProps) {
  const tagRowRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleTagCount, setVisibleTagCount] = useState(0)
  const { t } = useI18n()

  const getTagClassName = (tag: string) =>
    `px-3 py-1 rounded-full text-sm transition flex-shrink-0 whitespace-nowrap ${
      selectedTags.includes(tag)
        ? 'bg-amber-700 dark:bg-sky-600 text-white ui-skin-pill-active'
        : 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-white hover:bg-amber-200 dark:hover:bg-slate-600 ui-skin-pill'
    }`

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  useEffect(() => {
    const row = tagRowRef.current
    const measure = measureRef.current
    if (!row || !measure) return

    const calculateVisibleTags = () => {
      const availableWidth = row.clientWidth
      if (availableWidth <= 0) return

      const tagNodes = Array.from(
        measure.querySelectorAll<HTMLElement>('[data-measure-tag]')
      )
      const gap = parseFloat(window.getComputedStyle(row).columnGap || '0') || 0
      const moreNodes = new Map(
        Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-more]')).map((node) => [
          Number(node.dataset.hiddenCount),
          node.offsetWidth,
        ])
      )

      let nextVisibleCount = 0

      for (let count = allTags.length; count >= 0; count -= 1) {
        const hiddenCount = allTags.length - count
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
  }, [allTags, t.catalog.moreCount])

  const displayTags = useMemo(
    () => allTags.slice(0, visibleTagCount),
    [allTags, visibleTagCount]
  )
  const hiddenTagCount = allTags.length - displayTags.length

  return (
    <div className="mb-6 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t.catalog.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-amber-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-500 bg-amber-50 dark:bg-slate-800 text-gray-900 dark:text-white ui-skin-input"
        />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">{t.catalog.filterByTags}</h3>
          <div ref={tagRowRef} className="flex flex-nowrap gap-2 overflow-hidden">
            {displayTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={getTagClassName(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >
                {tag}
              </button>
            ))}
            {hiddenTagCount > 0 && (
              <span className="px-3 py-1 text-sm flex-shrink-0 whitespace-nowrap ui-skin-secondary">
                +{hiddenTagCount} {t.catalog.moreCount}
              </span>
            )}
          </div>
          <div
            ref={measureRef}
            className="absolute left-0 top-0 h-0 overflow-hidden opacity-0 pointer-events-none whitespace-nowrap"
            aria-hidden="true"
          >
            {allTags.map((tag) => (
              <span key={tag} data-measure-tag className={getTagClassName(tag)}>
                {tag}
              </span>
            ))}
            {Array.from({ length: allTags.length }, (_, index) => index + 1).map((hiddenCount) => (
              <span
                key={hiddenCount}
                data-measure-more
                data-hidden-count={hiddenCount}
                className="px-3 py-1 text-sm whitespace-nowrap ui-skin-secondary"
              >
                +{hiddenCount} {t.catalog.moreCount}
              </span>
            ))}
          </div>

          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => onTagsChange([])}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline ui-skin-danger"
            >
              {t.catalog.clearFilters}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
