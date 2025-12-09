import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { SCROLL_SAVE_DELAY } from '@/lib/reader'

interface UseBookProgressOptions {
  bookId: string
  language: string
  loading: boolean
  isPagination: boolean
  isVertical: boolean
  contentRef: RefObject<HTMLDivElement | null>
  isSmoothScrollingRef: RefObject<boolean>
  totalPages: number
}

interface UseBookProgressReturn {
  currentPage: number
  setCurrentPage: Dispatch<SetStateAction<number>>
  currentPageRef: RefObject<number>
  bookIdRef: RefObject<string>
  bookLanguageRef: RefObject<string>
}

export function useBookProgress({
  bookId,
  language,
  loading,
  isPagination,
  isVertical,
  contentRef,
  isSmoothScrollingRef,
  totalPages,
}: UseBookProgressOptions): UseBookProgressReturn {
  const [currentPage, setCurrentPage] = useState(0)
  const hasRestoredScrollRef = useRef(false)
  const hasInitializedFromUrlRef = useRef(false)

  // Next.js navigation hooks for URL parameter sync
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Refs to avoid re-creating scroll listener on every render
  const bookIdRef = useRef(bookId)
  const bookLanguageRef = useRef(language)
  const currentPageRef = useRef(currentPage)
  const isVerticalRef = useRef(isVertical)

  // Keep refs up to date
  useEffect(() => {
    bookIdRef.current = bookId
    bookLanguageRef.current = language
    currentPageRef.current = currentPage
    isVerticalRef.current = isVertical
  }, [bookId, language, currentPage, isVertical])

  // Initialize page from URL parameter or saved progress - only on initial mount
  useEffect(() => {
    if (hasInitializedFromUrlRef.current) return
    hasInitializedFromUrlRef.current = true

    // First, check if there's a page parameter in the URL
    const pageParam = searchParams.get('page')
    if (pageParam && isPagination) {
      const pageNumber = parseInt(pageParam, 10)
      // URL uses 1-based page numbers, internal state uses 0-based
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber - 1)
        return
      }
    }

    // If no valid URL parameter, fall back to saved progress
    const progress = useReadingStore.getState().getProgress(bookId, language)
    if (progress) {
      setCurrentPage(progress.currentPage)
    }
  }, [bookId, language, searchParams, isPagination, totalPages])

  // Restore scroll position once after content is loaded
  useEffect(() => {
    // Only restore scroll position once, when content finishes loading
    if (loading || hasRestoredScrollRef.current) return
    if (isPagination) return // Don't restore scroll in pagination mode

    const progress = useReadingStore.getState().getProgress(bookId, language)
    if (progress?.scrollPosition !== undefined) {
      hasRestoredScrollRef.current = true
      // Suppress scroll saving during restoration
      if (isSmoothScrollingRef.current !== undefined) {
        ;(isSmoothScrollingRef as { current: boolean }).current = true
      }

      // Defer scroll restoration until content is rendered
      setTimeout(() => {
        if (contentRef.current && isVertical) {
          // Vertical scroll mode: restore horizontal scroll position (instant, no animation)
          contentRef.current.scrollLeft = progress.scrollPosition!
        } else if (!isVertical) {
          // Horizontal scroll mode: restore vertical scroll position (instant, no animation)
          window.scrollTo(0, progress.scrollPosition!)
        }

        // Reset flag after a short delay to allow scroll event to complete
        setTimeout(() => {
          if (isSmoothScrollingRef.current !== undefined) {
            ;(isSmoothScrollingRef as { current: boolean }).current = false
          }
        }, 100)
      }, 100)
    }
  }, [loading, isPagination, isVertical, bookId, language, contentRef, isSmoothScrollingRef])

  // Save progress when page changes (pagination mode) and update URL parameter
  useEffect(() => {
    if (loading) return

    if (isPagination) {
      useReadingStore.getState().setProgress(bookId, language, currentPage)

      // Update URL parameter with current page (1-based for user-friendly URLs)
      const newPageNumber = currentPage + 1
      const currentPageParam = searchParams.get('page')
      const currentPageFromUrl = currentPageParam ? parseInt(currentPageParam, 10) : null

      // Only update URL if it differs from current state to avoid unnecessary history entries
      if (currentPageFromUrl !== newPageNumber) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', newPageNumber.toString())
        // Use replace to avoid creating history entries for every page turn
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
    } else {
      // In scroll mode, remove the page parameter from URL if it exists
      if (searchParams.has('page')) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('page')
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(newUrl, { scroll: false })
      }
    }
  }, [currentPage, bookId, language, loading, isPagination, searchParams, router, pathname])

  // Save scroll position periodically for scroll mode
  useEffect(() => {
    if (loading || isPagination) return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      // Skip saving during programmatic smooth scrolls
      if (isSmoothScrollingRef.current) {
        return
      }

      // Debounce scroll saving
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      scrollTimeout = setTimeout(() => {
        // Double-check flag in case smooth scroll started during debounce
        if (isSmoothScrollingRef.current) {
          return
        }

        let scrollPosition: number
        if (isVerticalRef.current && contentRef.current) {
          // Vertical scroll mode: save horizontal scroll position
          scrollPosition = contentRef.current.scrollLeft
        } else {
          // Horizontal scroll mode: save vertical scroll position
          scrollPosition = window.scrollY
        }
        // Use refs to get the latest values without re-creating the listener
        useReadingStore.getState().setProgress(
          bookIdRef.current,
          bookLanguageRef.current,
          currentPageRef.current,
          scrollPosition
        )
      }, SCROLL_SAVE_DELAY)
    }

    // Listen to appropriate scroll event based on mode
    if (isVertical) {
      const container = contentRef.current
      if (container) {
        container.addEventListener('scroll', handleScroll)
        return () => {
          container.removeEventListener('scroll', handleScroll)
          if (scrollTimeout) clearTimeout(scrollTimeout)
        }
      }
    } else {
      window.addEventListener('scroll', handleScroll)
      return () => {
        window.removeEventListener('scroll', handleScroll)
        if (scrollTimeout) clearTimeout(scrollTimeout)
      }
    }
  }, [loading, isPagination, isVertical, contentRef, isSmoothScrollingRef])

  return {
    currentPage,
    setCurrentPage,
    currentPageRef,
    bookIdRef,
    bookLanguageRef,
  }
}
