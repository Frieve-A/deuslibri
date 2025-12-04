import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction } from 'react'
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
}: UseBookProgressOptions): UseBookProgressReturn {
  const [currentPage, setCurrentPage] = useState(0)
  const hasRestoredScrollRef = useRef(false)

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

  // Load saved progress (page and scroll position) - only on initial mount
  useEffect(() => {
    const progress = useReadingStore.getState().getProgress(bookId, language)
    if (progress) {
      setCurrentPage(progress.currentPage)
    }
  }, [bookId, language])

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

  // Save progress when page changes (pagination mode)
  useEffect(() => {
    if (!loading && isPagination) {
      useReadingStore.getState().setProgress(bookId, language, currentPage)
    }
  }, [currentPage, bookId, language, loading, isPagination])

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
