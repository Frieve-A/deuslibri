import { useRef, RefObject, useCallback } from 'react'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import {
  EDGE_THRESHOLD,
  MIN_SWIPE_DISTANCE,
  LONG_PRESS_DURATION,
  CLICK_THRESHOLD,
  SCROLL_AMOUNT_RATIO,
  SMOOTH_SCROLL_DURATION,
} from '@/lib/reader'
import { isPointInsideSelection } from '@/lib/reader'

interface UseTouchNavigationOptions {
  isVertical: boolean
  isPagination: boolean
  contentRef: RefObject<HTMLDivElement | null>
  isSmoothScrollingRef: RefObject<boolean>
  bookIdRef: RefObject<string>
  bookLanguageRef: RefObject<string>
  currentPageRef: RefObject<number>
  goToNextPage: () => void
  goToPrevPage: () => void
}

interface UseTouchNavigationReturn {
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
  touchHandledRef: RefObject<boolean>
}

export function useTouchNavigation({
  isVertical,
  isPagination,
  contentRef,
  isSmoothScrollingRef,
  bookIdRef,
  bookLanguageRef,
  currentPageRef,
  goToNextPage,
  goToPrevPage,
}: UseTouchNavigationOptions): UseTouchNavigationReturn {
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const touchEndY = useRef<number>(0)
  const touchStartScrollLeft = useRef<number>(0)

  // Touch long-press detection for text selection
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef<boolean>(false)
  const touchStartTimeRef = useRef<number>(0)
  const touchedInsideSelectionRef = useRef<boolean>(false)

  // Flag to track if touch event was handled (to prevent duplicate handling by mouse events)
  const touchHandledRef = useRef<boolean>(false)

  // Vertical-rl mode edge detection (horizontal edges)
  // See detailed spec: docs/VERTICAL_MODE_SPEC.md
  // IMPORTANT: These track VISIBLE CONTENT position, not scrollLeft value
  // - scrollLeft = 0: RIGHT edge content visible (reading start)
  // - scrollLeft = -maxScroll: LEFT edge content visible (reading end)
  const isAtRightEdgeContentRef = useRef<boolean>(false) // Right edge content visible (reading start)
  const isAtLeftEdgeContentRef = useRef<boolean>(false) // Left edge content visible (reading end)

  // Horizontal mode edge detection (vertical edges)
  // For horizontal pagination mode, track top/bottom scroll position
  const isAtTopEdgeRef = useRef<boolean>(false)
  const isAtBottomEdgeRef = useRef<boolean>(false)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Mark that touch event is being handled (to prevent duplicate mouse event handling)
      touchHandledRef.current = true

      const touchX = e.touches[0].clientX
      const touchY = e.touches[0].clientY
      touchStartX.current = touchX
      touchStartY.current = touchY
      touchStartTimeRef.current = Date.now()
      isLongPressRef.current = false

      // Check if touch is inside existing text selection
      // If so, allow browser's native context menu / selection handles
      touchedInsideSelectionRef.current = isPointInsideSelection(touchX, touchY)
      if (touchedInsideSelectionRef.current) {
        // Don't set up long press timer or interfere with selection
        return
      }

      // Clear any existing long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }

      // Set up long press timer for text selection mode
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        // Trigger native text selection at the touch point
        // This allows the browser's native selection UI to appear
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          const range = document.caretRangeFromPoint(touchX, touchY)
          if (range) {
            selection.addRange(range)
            // Select the word at the touch point
            selection.modify('extend', 'backward', 'word')
            selection.modify('extend', 'forward', 'word')
          }
        }
      }, LONG_PRESS_DURATION)

      // Record scroll position at touch start and check if at edge
      const element = contentRef.current
      if (element) {
        // CRITICAL: For vertical mode, the actual scrolling element is the inner prose element
        // contentRef.scrollLeft is always 0, must use prose.scrollLeft
        const prose =
          isVertical && element.firstElementChild
            ? (element.firstElementChild as HTMLElement)
            : null
        const scrollingElement = prose || element

        touchStartScrollLeft.current = scrollingElement.scrollLeft

        // For vertical mode, check the inner content width (firstElementChild)
        // For horizontal mode, use the container itself
        const scrollableWidth =
          isVertical && element.firstElementChild
            ? (element.firstElementChild as HTMLElement).scrollWidth
            : element.scrollWidth
        const visibleWidth = element.clientWidth

        // Check if content is actually scrollable
        const isScrollable = scrollableWidth > visibleWidth

        if (!isScrollable) {
          // If not scrollable, content fits on screen - allow page swipe in both directions
          isAtRightEdgeContentRef.current = true
          isAtLeftEdgeContentRef.current = true
        } else {
          if (isVertical && prose) {
            // For vertical-rl mode (Japanese reading):
            // - scrollLeft in Firefox ranges from 0 (scroll at left) to -maxScroll (scroll at right)
            // - When scrollLeft = 0: scroll position is at LEFT, so RIGHT edge content is visible (reading start)
            // - When scrollLeft = -maxScroll: scroll position is at RIGHT, so LEFT edge content is visible (reading end)
            const scrollLeft = prose.scrollLeft
            const maxScroll = scrollableWidth - visibleWidth

            // Detect which content edge is visible:
            // - RIGHT edge content visible: scrollLeft close to 0 (reading start position)
            // - LEFT edge content visible: scrollLeft close to -maxScroll (reading end position)
            isAtRightEdgeContentRef.current = scrollLeft >= -EDGE_THRESHOLD // RIGHT content visible (scrollLeft ≈ 0)
            isAtLeftEdgeContentRef.current =
              scrollLeft <= -(maxScroll - EDGE_THRESHOLD) // LEFT content visible (scrollLeft ≈ -maxScroll)
          } else {
            // Horizontal mode: scrollLeft behaves normally (0 = left, maxScroll = right)
            const scrollLeft = element.scrollLeft
            const maxScroll = scrollableWidth - visibleWidth
            isAtRightEdgeContentRef.current = scrollLeft >= maxScroll - EDGE_THRESHOLD
            isAtLeftEdgeContentRef.current = scrollLeft <= EDGE_THRESHOLD
          }
        }

        // For horizontal pagination mode, also check vertical scroll position (top/bottom edges)
        if (!isVertical && isPagination) {
          const scrollTop = element.scrollTop
          const maxScrollY = element.scrollHeight - element.clientHeight
          const isScrollableY = maxScrollY > 0

          if (!isScrollableY) {
            // Content fits on screen - allow page swipe in both directions
            isAtTopEdgeRef.current = true
            isAtBottomEdgeRef.current = true
          } else {
            isAtTopEdgeRef.current = scrollTop <= EDGE_THRESHOLD
            isAtBottomEdgeRef.current = scrollTop >= maxScrollY - EDGE_THRESHOLD
          }
        }
      }
    },
    [contentRef, isVertical, isPagination]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If touched inside selection, let browser handle it (selection handle drag)
    if (touchedInsideSelectionRef.current) {
      return
    }

    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY

    // Cancel long press timer if finger moved significantly (before long press triggered)
    const distanceX = touchEndX.current - touchStartX.current
    const distanceY = touchEndY.current - touchStartY.current
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

    if (totalDistance > CLICK_THRESHOLD && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // If in long press mode (text selection), extend selection to current touch position
    if (isLongPressRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = document.caretRangeFromPoint(touchEndX.current, touchEndY.current)
        if (range) {
          selection.extend(range.startContainer, range.startOffset)
        }
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // If touched inside selection, let browser handle it (context menu, etc.)
    if (touchedInsideSelectionRef.current) {
      touchedInsideSelectionRef.current = false
      return
    }

    // If long press occurred, skip navigation (user is in text selection mode)
    if (isLongPressRef.current) {
      isLongPressRef.current = false
      // Reset touch state
      touchStartX.current = 0
      touchStartY.current = 0
      touchEndX.current = 0
      touchEndY.current = 0
      touchStartScrollLeft.current = 0
      isAtRightEdgeContentRef.current = false
      isAtLeftEdgeContentRef.current = false
      return
    }

    const swipeDistanceX = touchStartX.current - touchEndX.current
    const swipeDistanceY = touchStartY.current - touchEndY.current
    const totalDistance = Math.sqrt(
      swipeDistanceX * swipeDistanceX + swipeDistanceY * swipeDistanceY
    )
    // Tap: no touchmove occurred (touchEndX/Y still 0) OR total movement < 10px
    const isTap =
      (touchEndX.current === 0 && touchEndY.current === 0) || totalDistance < CLICK_THRESHOLD

    if (isTap && isVertical && isPagination) {
      // Tap navigation for vertical pagination mode
      // First check if we can scroll within page, otherwise navigate to prev/next page
      const element = contentRef.current
      if (element) {
        const prose = element.firstElementChild as HTMLElement
        if (prose) {
          const rect = element.getBoundingClientRect()
          const tapX = touchStartX.current
          const elementCenter = rect.left + rect.width / 2
          const scrollAmount = rect.width * SCROLL_AMOUNT_RATIO

          const currentScrollLeft = prose.scrollLeft
          const maxScroll = prose.scrollWidth - prose.clientWidth

          // In vertical-rl mode:
          // - scrollLeft = 0: RIGHT edge content visible
          // - scrollLeft = -maxScroll: LEFT edge content visible
          const isAtRightEdge = currentScrollLeft >= -5
          const isAtLeftEdge = currentScrollLeft <= -(maxScroll - 5)

          if (tapX > elementCenter) {
            // Tapped right side - scroll toward right (reading start) or go to prev page
            if (isAtRightEdge) {
              goToPrevPage()
            } else {
              // Scroll toward right edge (increase scrollLeft toward 0)
              const newScrollLeft = Math.min(0, currentScrollLeft + scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          } else {
            // Tapped left side - scroll toward left (reading end) or go to next page
            if (isAtLeftEdge) {
              goToNextPage()
            } else {
              // Scroll toward left edge (decrease scrollLeft toward -maxScroll)
              const newScrollLeft = Math.max(-maxScroll, currentScrollLeft - scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          }
        }
      }
    } else if (isTap && !isVertical && isPagination) {
      // Tap navigation for horizontal pagination mode
      // Top half = scroll up / prev page, Bottom half = scroll down / next page
      const element = contentRef.current
      if (element) {
        const rect = element.getBoundingClientRect()
        const tapY = touchStartY.current
        const elementCenter = rect.top + rect.height / 2
        const scrollAmount = element.clientHeight * SCROLL_AMOUNT_RATIO
        const currentScrollTop = element.scrollTop
        const maxScroll = element.scrollHeight - element.clientHeight
        const isAtBottom = currentScrollTop >= maxScroll - 5
        const isAtTop = currentScrollTop <= 5

        if (tapY > elementCenter) {
          // Tapped bottom half - scroll down or go to next page
          if (isAtBottom) {
            goToNextPage()
          } else {
            const newScrollTop = Math.min(maxScroll, currentScrollTop + scrollAmount)
            element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
          }
        } else {
          // Tapped top half - scroll up or go to prev page
          if (isAtTop) {
            goToPrevPage()
          } else {
            const newScrollTop = Math.max(0, currentScrollTop - scrollAmount)
            element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
          }
        }
      }
    } else if (isTap && isVertical && !isPagination) {
      // Tap navigation for vertical scroll mode
      // Scroll horizontally based on tap position (left/right of center)
      const element = contentRef.current
      if (element) {
        const rect = element.getBoundingClientRect()
        const tapX = touchStartX.current
        const elementCenter = rect.left + rect.width / 2
        const scrollAmount = rect.width * SCROLL_AMOUNT_RATIO

        // Suppress scroll position saving during smooth scroll animation
        ;(isSmoothScrollingRef as { current: boolean }).current = true

        if (tapX > elementCenter) {
          // Tapped right side - scroll toward reading start (right)
          element.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        } else {
          // Tapped left side - scroll toward reading end (left)
          element.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        }

        // Reset flag after scroll animation completes and save final position
        setTimeout(() => {
          ;(isSmoothScrollingRef as { current: boolean }).current = false
          // Manually save position after smooth scroll completes
          const finalPos = element.scrollLeft
          useReadingStore.getState().setProgress(
            bookIdRef.current,
            bookLanguageRef.current,
            currentPageRef.current,
            finalPos
          )
        }, SMOOTH_SCROLL_DURATION)
      }
    } else if (isTap && !isVertical && !isPagination) {
      // Tap navigation for horizontal scroll mode
      // Top half = scroll up, Bottom half = scroll down
      const tapY = touchStartY.current
      const screenCenter = window.innerHeight / 2
      const scrollAmount = window.innerHeight * SCROLL_AMOUNT_RATIO

      // Suppress scroll position saving during smooth scroll animation
      ;(isSmoothScrollingRef as { current: boolean }).current = true

      if (tapY > screenCenter) {
        // Tapped bottom half - scroll down
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      } else {
        // Tapped top half - scroll up
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' })
      }

      // Reset flag after scroll animation completes and save final position
      setTimeout(() => {
        ;(isSmoothScrollingRef as { current: boolean }).current = false
        // Manually save position after smooth scroll completes
        const finalPos = window.scrollY
        useReadingStore.getState().setProgress(
          bookIdRef.current,
          bookLanguageRef.current,
          currentPageRef.current,
          finalPos
        )
      }, SMOOTH_SCROLL_DURATION)
    } else if (Math.abs(swipeDistanceX) > MIN_SWIPE_DISTANCE || Math.abs(swipeDistanceY) > MIN_SWIPE_DISTANCE) {
      // Check swipe direction and which content edge was visible at touch start
      const isHorizontalSwipe = Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)

      if (isVertical) {
        // Vertical-rl mode: RIGHT-to-LEFT reading (Japanese)
        // Only respond to horizontal swipes
        if (isHorizontalSwipe) {
          // Reading progression: RIGHT edge content (start) → LEFT edge content (end)
          //
          // When at LEFT edge content (reading end):
          //   - Right swipe (swipeDistanceX < 0) = NEXT page (continue reading forward)
          // When at RIGHT edge content (reading start):
          //   - Left swipe (swipeDistanceX > 0) = PREV page (go back)
          if (swipeDistanceX < 0 && isAtLeftEdgeContentRef.current) {
            goToNextPage() // Right swipe at left edge content = Next
          } else if (swipeDistanceX > 0 && isAtRightEdgeContentRef.current) {
            goToPrevPage() // Left swipe at right edge content = Prev
          }
        }
      } else if (isPagination) {
        // Horizontal pagination mode: respond to vertical swipes for page navigation
        if (!isHorizontalSwipe) {
          // Vertical swipe in horizontal pagination mode
          // swipeDistanceY > 0 means swiped UP (finger moved from bottom to top)
          // swipeDistanceY < 0 means swiped DOWN (finger moved from top to bottom)
          if (swipeDistanceY > 0 && isAtBottomEdgeRef.current) {
            // Swiped up at bottom edge = Next page
            goToNextPage()
          } else if (swipeDistanceY < 0 && isAtTopEdgeRef.current) {
            // Swiped down at top edge = Prev page
            goToPrevPage()
          }
        }
      } else {
        // Horizontal scroll mode (infinite scroll): horizontal swipes not used for navigation
        // Left/right swipes could be used for something else in the future
      }
    }

    // Reset
    touchStartX.current = 0
    touchStartY.current = 0
    touchEndX.current = 0
    touchEndY.current = 0
    touchStartScrollLeft.current = 0
    isAtRightEdgeContentRef.current = false
    isAtLeftEdgeContentRef.current = false
    isAtTopEdgeRef.current = false
    isAtBottomEdgeRef.current = false
  }, [
    isVertical,
    isPagination,
    contentRef,
    isSmoothScrollingRef,
    bookIdRef,
    bookLanguageRef,
    currentPageRef,
    goToNextPage,
    goToPrevPage,
  ])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    touchHandledRef,
  }
}
