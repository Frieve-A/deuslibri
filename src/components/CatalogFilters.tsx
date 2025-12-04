'use client'

import { useState } from 'react'
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
  const [showAllTags, setShowAllTags] = useState(false)
  const { t } = useI18n()

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const displayTags = showAllTags ? allTags : allTags.slice(0, 10)

  return (
    <div className="mb-6 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t.catalog.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-amber-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-sky-500 bg-amber-50 dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">{t.catalog.filterByTags}</h3>
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedTags.includes(tag)
                    ? 'bg-amber-700 dark:bg-sky-600 text-white'
                    : 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-white hover:bg-amber-200 dark:hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
            {allTags.length > 10 && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="px-3 py-1 text-sm text-amber-700 dark:text-sky-400 hover:underline"
              >
                {showAllTags ? t.catalog.showLess : `+${allTags.length - 10} ${t.catalog.moreCount}`}
              </button>
            )}
          </div>

          {selectedTags.length > 0 && (
            <button
              onClick={() => onTagsChange([])}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              {t.catalog.clearFilters}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
