'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Book, BookCatalogItem } from '@/types/book'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { markdownToHtml } from '@/lib/books/markdown'
import { generateTableOfContents } from '@/lib/books/toc'
import { useI18n } from '@/lib/i18n'
import TableOfContents from './TableOfContents'
import BookDetailsModal from './BookDetailsModal'
import { ReaderHeader, ReaderContent, PageNavigation } from './reader'
import {
  useBookProgress,
  usePageNavigation,
  useTouchNavigation,
  useMouseNavigation,
  useProgressBar,
  useVerticalLayout,
} from '@/hooks'

interface BookReaderProps {
  book: Book
}

export default function BookReader({ book }: BookReaderProps) {
  const [pageHtml, setPageHtml] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Flag to suppress scroll position saving during programmatic scrolls
  const isSmoothScrollingRef = useRef<boolean>(false)

  // Use selectors to avoid unnecessary re-renders when progress changes
  const settings = useReadingStore((state) => state.settings)
  const { t } = useI18n()

  // Subscribe to the actual data arrays so component re-renders when they change
  const favorites = useReadingStore((state) => state.favorites)
  const allBookmarks = useReadingStore((state) => state.bookmarks)
  const addFavorite = useReadingStore((state) => state.addFavorite)
  const removeFavorite = useReadingStore((state) => state.removeFavorite)
  const addBookmark = useReadingStore((state) => state.addBookmark)
  const removeBookmark = useReadingStore((state) => state.removeBookmark)

  // Calculate derived state - must be before useEffects that depend on them
  const isVertical = settings.writingMode === 'vertical' && book.language === 'ja'
  const isPagination = settings.displayMode === 'pagination'

  // Generate table of contents
  const toc = useMemo(() => generateTableOfContents(book.pages), [book.pages])

  // Book progress hook
  const {
    currentPage,
    setCurrentPage,
    currentPageRef,
    bookIdRef,
    bookLanguageRef,
  } = useBookProgress({
    bookId: book.id,
    language: book.language,
    loading,
    isPagination,
    isVertical,
    contentRef,
    isSmoothScrollingRef,
  })

  // Page navigation hook
  const { goToNextPage, goToPrevPage, navigationDirectionRef } = usePageNavigation({
    currentPage,
    setCurrentPage,
    totalPages: book.pages.length,
    displayMode: settings.displayMode,
    contentRef,
    isVertical,
  })

  // Touch navigation hook
  const { handleTouchStart, handleTouchMove, handleTouchEnd, touchHandledRef } =
    useTouchNavigation({
      isVertical,
      isPagination,
      contentRef,
      isSmoothScrollingRef,
      bookIdRef,
      bookLanguageRef,
      currentPageRef,
      goToNextPage,
      goToPrevPage,
    })

  // Mouse navigation hook
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useMouseNavigation({
    isVertical,
    isPagination,
    contentRef,
    isSmoothScrollingRef,
    bookIdRef,
    bookLanguageRef,
    currentPageRef,
    touchHandledRef,
    goToNextPage,
    goToPrevPage,
  })

  // Progress bar hook
  const { progressBarRef, handleProgressBarMouseDown } = useProgressBar({
    totalPages: book.pages.length,
    isVertical,
    loading,
    setCurrentPage,
  })

  // Vertical layout hook
  useVerticalLayout({
    loading,
    isVertical,
    isPagination,
    currentPage,
    contentRef,
    navigationDirectionRef,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Convert all pages to HTML with image path fixes
  useEffect(() => {
    const convertPages = async () => {
      const htmlPages = await Promise.all(
        book.pages.map((page) => markdownToHtml(page, book.folderPath))
      )
      setPageHtml(htmlPages)
      setLoading(false)
    }

    convertPages()
  }, [book])

  // Calculate derived state for mounted-dependent values
  // Compute from the actual arrays so changes trigger re-renders
  const favorite = mounted
    ? favorites.some((f) => f.bookId === book.id && f.language === book.language)
    : false
  const isBookmarked = mounted
    ? allBookmarks.some(
        (b) => b.bookId === book.id && b.language === book.language && b.pageIndex === currentPage
      )
    : false
  const bookmarks = mounted
    ? allBookmarks
        .filter((b) => b.bookId === book.id && b.language === book.language)
        .sort((a, b) => a.pageIndex - b.pageIndex)
    : []

  const toggleFavorite = () => {
    if (mounted) {
      if (favorite) {
        removeFavorite(book.id, book.language)
      } else {
        addFavorite(book.id, book.language)
      }
    }
  }

  const toggleBookmark = () => {
    if (mounted) {
      if (isBookmarked) {
        removeBookmark(book.id, book.language, currentPage)
      } else {
        addBookmark(book.id, book.language, currentPage)
      }
    }
  }

  // Convert Book to BookCatalogItem for the modal
  const bookCatalogItem: BookCatalogItem = {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    summary: book.summary,
    tags: book.tags,
    language: book.language,
    publishDate: book.publishDate,
    coverImage: book.coverImage,
    folderPath: book.folderPath,
  }

  const handleTitleClick = () => {
    setIsDetailsModalOpen(true)
  }

  // Handle page change from Table of Contents
  // In scroll mode, scroll to the page section instead of changing page
  const handleTocPageChange = (pageIndex: number) => {
    if (isPagination) {
      setCurrentPage(pageIndex)
    } else if (isVertical) {
      // Vertical scroll mode: scroll horizontally to the page section
      const pageElement = document.getElementById(`scroll-page-${pageIndex}`)
      const container = contentRef.current
      if (pageElement && container) {
        // In vertical-rl mode, we need to scroll the container horizontally
        // The page element's position is relative to the container
        const containerRect = container.getBoundingClientRect()
        const pageRect = pageElement.getBoundingClientRect()

        // Calculate how far right the page is from the container's right edge
        // In vertical-rl, content starts from the right
        const offsetFromRight = containerRect.right - pageRect.right

        // scrollLeft in vertical-rl is negative (0 = rightmost, negative = scrolled left)
        const newScrollLeft = container.scrollLeft - offsetFromRight

        container.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth',
        })
      }
    } else {
      // Horizontal scroll mode: scroll vertically to the page section with header offset
      const pageElement = document.getElementById(`scroll-page-${pageIndex}`)
      if (pageElement) {
        // Get header height to offset scroll position
        const header = document.querySelector('header')
        const headerHeight = header?.offsetHeight || 80

        const elementPosition = pageElement.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - headerHeight - 16 // 16px extra padding

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">{t.reader.loadingBook}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Table of Contents - available in both pagination and scroll modes */}
      <TableOfContents
        toc={toc}
        currentPage={currentPage}
        onPageChange={handleTocPageChange}
        bookmarks={bookmarks}
        isOpen={isTocOpen}
        onToggle={() => setIsTocOpen(!isTocOpen)}
        isScrollMode={!isPagination}
      />

      {/* Header */}
      <ReaderHeader
        book={book}
        toc={toc}
        bookmarks={bookmarks}
        isTocOpen={isTocOpen}
        setIsTocOpen={setIsTocOpen}
        favorite={favorite}
        toggleFavorite={toggleFavorite}
        isBookmarked={isBookmarked}
        toggleBookmark={toggleBookmark}
        isPagination={isPagination}
        t={t}
        onTitleClick={handleTitleClick}
      />

      {/* Reader Content */}
      <main className={`flex-1 ${isPagination ? 'overflow-hidden' : ''}`}>
        <ReaderContent
          pageHtml={pageHtml}
          currentPage={currentPage}
          isVertical={isVertical}
          isPagination={isPagination}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          contentRef={contentRef}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
        />
      </main>

      {/* Fixed Page Navigation (Pagination Mode Only) */}
      {isPagination && (
        <PageNavigation
          currentPage={currentPage}
          totalPages={book.pages.length}
          isVertical={isVertical}
          progressBarRef={progressBarRef}
          goToNextPage={goToNextPage}
          goToPrevPage={goToPrevPage}
          handleProgressBarMouseDown={handleProgressBarMouseDown}
          onPageIndicatorClick={() => setIsTocOpen(true)}
          t={t}
        />
      )}

      {/* Book Details Modal */}
      <BookDetailsModal
        book={bookCatalogItem}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  )
}
