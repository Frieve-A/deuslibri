'use client'

import { useState, useMemo } from 'react'
import { BookCatalogItem } from '@/types/book'
import BookCard from '@/components/BookCard'
import BookDetailsModal from '@/components/BookDetailsModal'
import CatalogFilters from '@/components/CatalogFilters'
import Header from '@/components/Header'
import { createBookSearch, filterByTags, getAllTags } from '@/lib/utils/search'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { useI18n } from '@/lib/i18n'

interface CatalogClientProps {
  books: BookCatalogItem[]
}

export default function CatalogClient({ books }: CatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'recent'>('all')
  const [selectedBook, setSelectedBook] = useState<BookCatalogItem | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const { favorites, recentlyRead } = useReadingStore()
  const { t, effectiveLanguage } = useI18n()

  const handleDetailsClick = (book: BookCatalogItem) => {
    setSelectedBook(book)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false)
    setSelectedBook(null)
  }

  const allTags = useMemo(() => getAllTags(books), [books])

  const filteredBooks = useMemo(() => {
    let result = books

    // Filter by view mode
    if (viewMode === 'favorites') {
      const favoriteIds = new Set(favorites.map((f) => `${f.bookId}-${f.language}`))
      result = result.filter((book) =>
        favoriteIds.has(`${book.id}-${book.language}`)
      )
    } else if (viewMode === 'recent') {
      const recentIds = new Set(recentlyRead.map((r) => `${r.bookId}-${r.language}`))
      result = result.filter((book) =>
        recentIds.has(`${book.id}-${book.language}`)
      )
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = filterByTags(result, selectedTags)
    }

    // Search
    if (searchQuery.trim()) {
      const searcher = createBookSearch(result)
      result = searcher.search(searchQuery)
    }

    return result
  }, [books, searchQuery, selectedTags, viewMode, favorites, recentlyRead])

  // Sort books with user's preferred language as highest priority, English as secondary
  // effectiveLanguage is either the explicit language setting, or browser language if 'default'
  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      // Language priority: User's preferred language > English > Others
      const getLanguagePriority = (lang: string) => {
        if (lang === effectiveLanguage) return 2 // User's preferred language: highest priority
        if (lang === 'en') return 1               // English: secondary priority
        return 0                                   // Other languages: lowest priority
      }

      const aPriority = getLanguagePriority(a.language)
      const bPriority = getLanguagePriority(b.language)

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      // Secondary sort: Publication date (newest first)
      const dateA = new Date(a.publishDate).getTime()
      const dateB = new Date(b.publishDate).getTime()
      if (dateA !== dateB) {
        return dateB - dateA
      }

      // Tertiary sort: Book title alphabetically
      return a.title.localeCompare(b.title, effectiveLanguage)
    })
  }, [filteredBooks, effectiveLanguage])

  return (
    <>
      <Header />
      <div className="min-h-screen p-8 bg-stone-100 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t.catalog.title}</h1>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded ${
              viewMode === 'all'
                ? 'bg-amber-700 dark:bg-sky-600 text-white'
                : 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-white hover:bg-amber-200 dark:hover:bg-slate-600'
            }`}
          >
            {t.catalog.allBooks} ({books.length})
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`px-4 py-2 rounded ${
              viewMode === 'favorites'
                ? 'bg-amber-700 dark:bg-sky-600 text-white'
                : 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-white hover:bg-amber-200 dark:hover:bg-slate-600'
            }`}
          >
            {t.catalog.favorites} ({favorites.length})
          </button>
          <button
            onClick={() => setViewMode('recent')}
            className={`px-4 py-2 rounded ${
              viewMode === 'recent'
                ? 'bg-amber-700 dark:bg-sky-600 text-white'
                : 'bg-amber-100 dark:bg-slate-700 text-amber-900 dark:text-white hover:bg-amber-200 dark:hover:bg-slate-600'
            }`}
          >
            {t.catalog.recentlyRead} ({recentlyRead.length})
          </button>
        </div>

        {/* Filters */}
        <CatalogFilters
          allTags={allTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Book Grid */}
        {sortedBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">
              {books.length === 0
                ? t.catalog.noBooksYet
                : t.catalog.noBooks}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedBooks.map((book) => (
              <BookCard
                key={`${book.id}-${book.language}`}
                book={book}
                onDetailsClick={handleDetailsClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        book={selectedBook}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
      />
    </div>
    </>
  )
}
