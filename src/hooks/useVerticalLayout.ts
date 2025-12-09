import { useEffect, useCallback, RefObject, MutableRefObject } from 'react'

interface UseVerticalLayoutOptions {
  loading: boolean
  isVertical: boolean
  isPagination: boolean
  currentPage: number
  contentRef: RefObject<HTMLDivElement | null>
  navigationDirectionRef: MutableRefObject<'next' | 'prev' | null>
}

export function useVerticalLayout({
  loading,
  isVertical,
  isPagination,
  currentPage,
  contentRef,
  navigationDirectionRef,
}: UseVerticalLayoutOptions): void {
  // Function to update prose element dimensions
  const updateProseLayout = useCallback(() => {
    if (!loading && isVertical && contentRef.current && isPagination) {
      const container = contentRef.current
      const prose = container.firstElementChild as HTMLElement
      if (prose) {
        const containerHeight = container.clientHeight
        // Use setProperty with !important to override content-based height
        prose.style.setProperty('height', `${containerHeight}px`, 'important')
        prose.style.setProperty('max-height', `${containerHeight}px`, 'important')
        // Enable horizontal scroll on prose element for vertical writing mode
        prose.style.overflowX = 'auto'
        prose.style.overflowY = 'hidden'
      }
    }
  }, [loading, isVertical, isPagination, contentRef])

  // Fix prose element height for vertical mode
  // In writing-mode: vertical-rl, CSS height property is overridden by content height
  // CSS height/max-height specifications are ignored, so we must use JavaScript with !important
  useEffect(() => {
    updateProseLayout()
  }, [updateProseLayout, currentPage])

  // Listen to window resize and zoom changes to update layout
  useEffect(() => {
    if (!loading && isVertical && isPagination) {
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null

      const handleResize = () => {
        // Debounce resize events to avoid excessive recalculations
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        resizeTimeout = setTimeout(() => {
          updateProseLayout()
        }, 100)
      }

      // Listen to window resize (covers both window resize and zoom changes)
      window.addEventListener('resize', handleResize)

      // Also use ResizeObserver for container-specific size changes
      let resizeObserver: ResizeObserver | null = null
      if (contentRef.current) {
        resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(contentRef.current)
      }

      return () => {
        window.removeEventListener('resize', handleResize)
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
      }
    }
  }, [loading, isVertical, isPagination, contentRef, updateProseLayout])

  // Scroll to appropriate edge for vertical mode when page changes
  // See docs/VERTICAL_MODE_SPEC.md for detailed specification
  useEffect(() => {
    if (!loading && isVertical && contentRef.current && isPagination) {
      const direction = navigationDirectionRef.current
      navigationDirectionRef.current = null

      // Wait for content layout to complete before setting scroll position
      // dangerouslySetInnerHTML content may not be fully laid out immediately
      // Poll until scrollWidth stabilizes (max 500ms)
      let attempts = 0
      const maxAttempts = 50
      let lastScrollWidth = 0

      const checkAndScroll = () => {
        if (!contentRef.current) return

        const prose = contentRef.current.firstElementChild as HTMLElement
        if (!prose) return

        const currentScrollWidth = prose.scrollWidth

        if (currentScrollWidth !== lastScrollWidth && attempts < maxAttempts) {
          lastScrollWidth = currentScrollWidth
          attempts++
          setTimeout(checkAndScroll, 10)
          return
        }

        // Layout is stable, now set scroll position
        // IMPORTANT: In vertical-rl mode, scrollLeft values are NEGATIVE
        // - scrollLeft = 0: RIGHT edge content visible (reading START)
        // - scrollLeft = -maxScroll: LEFT edge content visible (reading END)
        // CRITICAL: For vertical mode, the actual scrolling element is the inner prose element
        const maxScroll = prose.scrollWidth - prose.clientWidth
        if (direction === 'prev') {
          // Prev: show LEFT edge (where user left off on previous page)
          prose.scrollLeft = -maxScroll
        } else {
          // Next/initial: show RIGHT edge (start of page)
          prose.scrollLeft = 0
        }
      }

      setTimeout(checkAndScroll, 10)
    }
  }, [currentPage, loading, isVertical, isPagination, contentRef, navigationDirectionRef])

  // Scroll to appropriate edge for horizontal mode when page changes
  // When going to previous page, scroll to bottom (where user left off)
  // When going to next page, scroll to top (start of page)
  useEffect(() => {
    if (!loading && !isVertical && contentRef.current && isPagination) {
      const direction = navigationDirectionRef.current
      navigationDirectionRef.current = null

      // Wait for content layout to complete before setting scroll position
      let attempts = 0
      const maxAttempts = 50
      let lastScrollHeight = 0

      const checkAndScroll = () => {
        if (!contentRef.current) return

        const element = contentRef.current
        const currentScrollHeight = element.scrollHeight

        if (currentScrollHeight !== lastScrollHeight && attempts < maxAttempts) {
          lastScrollHeight = currentScrollHeight
          attempts++
          setTimeout(checkAndScroll, 10)
          return
        }

        // Layout is stable, now set scroll position
        const maxScroll = element.scrollHeight - element.clientHeight
        if (direction === 'prev') {
          // Prev: scroll to bottom (where user left off on previous page)
          element.scrollTop = maxScroll
        } else {
          // Next/initial: scroll to top (start of page)
          element.scrollTop = 0
        }
      }

      setTimeout(checkAndScroll, 10)
    }
  }, [currentPage, loading, isVertical, isPagination, contentRef, navigationDirectionRef])
}
