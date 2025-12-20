import { useState, useEffect, useRef, RefObject, Dispatch, SetStateAction, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const initialPageFromUrlRef = useRef<number | null>(null)
  // Track the target page during initialization to prevent premature URL updates
  // This is needed because setCurrentPage is async but hasInitializedFromUrlRef is set synchronously
  const initializingToPageRef = useRef<number | null>(null)

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  // Next.js navigation hooks for URL parameter sync
  // Note: We avoid useSearchParams() to support static export
  const router = useRouter()
  const pathname = usePathname()

  // Helper to get search params from window.location (client-side only)
  const getSearchParams = useCallback(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])

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

  // Initialize page from URL parameter or saved progress - only after loading completes
  useEffect(() => {
    // Wait for loading to complete before initializing (settings must be ready)
    if (loading) return
    if (hasInitializedFromUrlRef.current) return
    hasInitializedFromUrlRef.current = true

    // First, check if there's a page parameter in the URL
    const searchParams = getSearchParams()
    const pageParam = searchParams.get('page')
    if (pageParam) {
      const pageNumber = parseInt(pageParam, 10)
      // URL uses 1-based page numbers, internal state uses 0-based
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        if (isPagination) {
          // Store target page to prevent URL update effect from running with stale currentPage
          initializingToPageRef.current = pageNumber - 1
          setCurrentPage(pageNumber - 1)
          return
        } else {
          // Infinite scroll mode: save page number to scroll to later
          initialPageFromUrlRef.current = pageNumber - 1
          // Do NOT fall through to saved progress - we have a URL target
          return
        }
      }
    }

    // If no valid URL parameter, fall back to saved progress
    const progress = useReadingStore.getState().getProgress(bookId, language)
    if (progress) {
      setCurrentPage(progress.currentPage)
    }
  }, [bookId, language, getSearchParams, isPagination, totalPages, loading])

  // Restore scroll position once after content is loaded
  // For vertical mode, we must wait for KaTeX rotation to complete before scrolling
  useEffect(() => {
    // Only restore scroll position once, when content finishes loading
    if (loading || hasRestoredScrollRef.current) return
    if (isPagination) return // Don't restore scroll in pagination mode

    // Wait for initialization to complete first
    if (!hasInitializedFromUrlRef.current) {
      return
    }

    // Function to execute the actual scroll
    const executeScroll = () => {
      // Guard: prevent multiple executions
      if (hasRestoredScrollRef.current) {
        return
      }

      // If page was specified in URL, scroll to that page's start position (takes priority)
      const targetPage = initialPageFromUrlRef.current
      if (targetPage !== null) {
        hasRestoredScrollRef.current = true
        initialPageFromUrlRef.current = null

        // Suppress scroll saving during programmatic scroll
        if (isSmoothScrollingRef.current !== undefined) {
          ;(isSmoothScrollingRef as { current: boolean }).current = true
        }

        const pageElement = document.getElementById(`scroll-page-${targetPage}`)

        if (isVertical && contentRef.current && pageElement) {
          // Vertical scroll mode: scroll horizontally to the page section (instant, no animation)
          const container = contentRef.current
          // Temporarily disable smooth scroll (CSS scroll-behavior: smooth affects scrollLeft assignment)
          const originalScrollBehavior = container.style.scrollBehavior
          container.style.scrollBehavior = 'auto'
          const containerRect = container.getBoundingClientRect()
          const pageRect = pageElement.getBoundingClientRect()
          const offsetFromRight = containerRect.right - pageRect.right
          const newScrollLeft = container.scrollLeft - offsetFromRight
          container.scrollLeft = newScrollLeft
          // Restore original scroll behavior
          container.style.scrollBehavior = originalScrollBehavior
        } else if (!isVertical && pageElement) {
          // Horizontal scroll mode: scroll vertically to the page section (instant, no animation)
          // Temporarily disable smooth scroll on html element
          const html = document.documentElement
          const originalScrollBehavior = html.style.scrollBehavior
          html.style.scrollBehavior = 'auto'
          const header = document.querySelector('header')
          const headerHeight = header?.offsetHeight || 80
          const elementPosition = pageElement.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.scrollY - headerHeight - 16
          window.scrollTo(0, offsetPosition)
          // Restore original scroll behavior
          html.style.scrollBehavior = originalScrollBehavior
          // Signal that scroll restoration is complete for horizontal scroll mode
          window.dispatchEvent(new CustomEvent('scroll-restoration-complete'))
        }

        // Reset flag after a short delay to allow scroll event to complete
        setTimeout(() => {
          if (isSmoothScrollingRef.current !== undefined) {
            ;(isSmoothScrollingRef as { current: boolean }).current = false
          }
        }, 100)
        return
      }

      // If no URL page parameter, fall back to saved scroll position
      const progress = useReadingStore.getState().getProgress(bookId, language)
      if (progress?.scrollPosition !== undefined) {
        hasRestoredScrollRef.current = true
        // Suppress scroll saving during restoration
        if (isSmoothScrollingRef.current !== undefined) {
          ;(isSmoothScrollingRef as { current: boolean }).current = true
        }

        if (contentRef.current && isVertical) {
          // Vertical scroll mode: restore horizontal scroll position (instant, no animation)
          // Temporarily disable smooth scroll (CSS scroll-behavior: smooth affects scrollLeft assignment)
          const container = contentRef.current
          const originalScrollBehavior = container.style.scrollBehavior
          container.style.scrollBehavior = 'auto'
          container.scrollLeft = progress.scrollPosition!
          container.style.scrollBehavior = originalScrollBehavior
        } else if (!isVertical) {
          // Horizontal scroll mode: restore vertical scroll position (instant, no animation)
          // Temporarily disable smooth scroll on html element
          const html = document.documentElement
          const originalScrollBehavior = html.style.scrollBehavior
          html.style.scrollBehavior = 'auto'
          window.scrollTo(0, progress.scrollPosition!)
          html.style.scrollBehavior = originalScrollBehavior
          // Signal that scroll restoration is complete for horizontal scroll mode
          window.dispatchEvent(new CustomEvent('scroll-restoration-complete'))
        }

        // Reset flag after a short delay to allow scroll event to complete
        setTimeout(() => {
          if (isSmoothScrollingRef.current !== undefined) {
            ;(isSmoothScrollingRef as { current: boolean }).current = false
          }
        }, 100)
      } else {
        // No saved scroll position
        if (isVertical && contentRef.current) {
          // Vertical scroll mode: scroll to the rightmost position (start of content in vertical-rl)
          // In vertical-rl mode, scrollLeft is negative and starts at 0 (leftmost = end of book)
          // We need to scroll to the maximum scrollLeft to show the beginning of the book
          const container = contentRef.current
          const originalScrollBehavior = container.style.scrollBehavior
          container.style.scrollBehavior = 'auto'
          // scrollWidth - clientWidth gives the maximum scroll distance
          // For vertical-rl, this positions us at the rightmost (beginning) of content
          container.scrollLeft = container.scrollWidth - container.clientWidth
          container.style.scrollBehavior = originalScrollBehavior
          hasRestoredScrollRef.current = true
        } else if (!isVertical) {
          // Horizontal scroll mode - still need to show content
          window.dispatchEvent(new CustomEvent('scroll-restoration-complete'))
        }
      }
    }

    // For vertical mode, wait for KaTeX rotation to complete before scrolling
    // KaTeX rotation modifies element styles which causes layout shifts
    if (isVertical) {
      const handleKatexComplete = () => {
        // Small delay to ensure all layout changes have been applied
        setTimeout(executeScroll, 50)
      }

      // Listen for the katex-rotation-complete event
      window.addEventListener('katex-rotation-complete', handleKatexComplete, { once: true })

      // Fallback timeout in case the event doesn't fire (e.g., no KaTeX elements)
      const fallbackTimer = setTimeout(() => {
        window.removeEventListener('katex-rotation-complete', handleKatexComplete)
        executeScroll()
      }, 500)

      return () => {
        window.removeEventListener('katex-rotation-complete', handleKatexComplete)
        clearTimeout(fallbackTimer)
      }
    } else {
      // For horizontal mode, scroll after a short delay for content to render
      const timer = setTimeout(executeScroll, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, isPagination, isVertical, bookId, language, contentRef, isSmoothScrollingRef])

  // Save progress when page changes (pagination mode) and update URL parameter
  useEffect(() => {
    if (loading) return
    // Wait for initialization to complete before updating URL
    // This prevents overwriting the URL's page parameter with the default value (0)
    if (!hasInitializedFromUrlRef.current) return

    // Wait for currentPage to reach the initialization target before updating URL
    // This handles the async nature of setCurrentPage - the URL update effect may run
    // before currentPage has been updated to the value from the URL parameter
    if (initializingToPageRef.current !== null) {
      if (currentPage !== initializingToPageRef.current) {
        return
      }
      // Clear the target once reached
      initializingToPageRef.current = null
    }

    if (isPagination) {
      useReadingStore.getState().setProgress(bookId, language, currentPage)

      // Update URL parameter with current page (1-based for user-friendly URLs)
      const searchParams = getSearchParams()
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
      // Use history.replaceState directly to avoid Next.js scroll restoration behavior
      const searchParams = getSearchParams()
      if (searchParams.has('page')) {
        // Wait for scroll restoration to complete before removing page param
        // Timing: KaTeX event (~66ms) + executeScroll delay (50ms) + buffer (100ms) = ~216ms
        // Using 250ms to ensure scroll is complete before URL update
        setTimeout(() => {
          const params = new URLSearchParams(getSearchParams().toString())
          params.delete('page')
          const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
          // Use native history API to avoid Next.js router triggering scroll restoration
          window.history.replaceState(window.history.state, '', newUrl)
        }, 250)
      }
    }
  }, [currentPage, bookId, language, loading, isPagination, getSearchParams, router, pathname, contentRef])

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
