import { useRef, RefObject, useCallback } from 'react'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import {
  CLICK_THRESHOLD,
  SCROLL_AMOUNT_RATIO,
  SMOOTH_SCROLL_DURATION,
  HORIZONTAL_EDGE_CLICK_RATIO,
} from '@/lib/reader'
import { isPointInsideSelection } from '@/lib/reader'

interface UseMouseNavigationOptions {
  isVertical: boolean
  isPagination: boolean
  contentRef: RefObject<HTMLDivElement | null>
  isSmoothScrollingRef: RefObject<boolean>
  bookIdRef: RefObject<string>
  bookLanguageRef: RefObject<string>
  currentPageRef: RefObject<number>
  touchHandledRef: RefObject<boolean>
  goToNextPage: () => void
  goToPrevPage: () => void
}

interface UseMouseNavigationReturn {
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: (e: React.MouseEvent) => void
}

export function useMouseNavigation({
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
}: UseMouseNavigationOptions): UseMouseNavigationReturn {
  // Mouse drag detection refs
  const mouseStartX = useRef<number>(0)
  const mouseStartY = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)
  const clickedInsideSelectionRef = useRef<boolean>(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button (0), ignore right-click (2) and middle-click (1)
      if (e.button !== 0) return

      // If this mousedown follows a touch event, skip (touch already handled it)
      // Reset the flag here so pure mouse interactions work normally
      if (touchHandledRef.current) {
        // Don't reset yet - wait for mouseup to complete the touch sequence
        return
      }

      // Check if click is inside existing text selection
      // If so, allow browser's native context menu / selection adjustment
      clickedInsideSelectionRef.current = isPointInsideSelection(e.clientX, e.clientY)
      if (clickedInsideSelectionRef.current) {
        // Don't prevent default - allow browser to handle selection
        return
      }

      mouseStartX.current = e.clientX
      mouseStartY.current = e.clientY
      isDraggingRef.current = false
      mouseDownTargetRef.current = e.target
      // Prevent text selection from starting immediately
      e.preventDefault()
    },
    [touchHandledRef]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // If clicked inside selection, let browser handle it
    if (clickedInsideSelectionRef.current) return
    if (mouseDownTargetRef.current === null) return // Not in a mouse down state

    const distanceX = e.clientX - mouseStartX.current
    const distanceY = e.clientY - mouseStartY.current
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

    // If moved more than 10px, consider it a drag (text selection intent)
    if (!isDraggingRef.current && totalDistance >= CLICK_THRESHOLD) {
      isDraggingRef.current = true
      // Start text selection programmatically from the original mousedown position
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        // Use caretRangeFromPoint to get the position at mousedown
        const range = document.caretRangeFromPoint(mouseStartX.current, mouseStartY.current)
        if (range) {
          selection.addRange(range)
        }
      }
    }

    // If dragging, extend the selection to current position
    if (isDraggingRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY)
        if (range) {
          selection.extend(range.startContainer, range.startOffset)
        }
      }
    }
  }, [])

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button (0), ignore right-click (2) and middle-click (1)
      if (e.button !== 0) return

      // If this mouseup follows a touch event, skip (touch already handled navigation)
      if (touchHandledRef.current) {
        ;(touchHandledRef as { current: boolean }).current = false
        return
      }

      // If clicked inside selection, let browser handle it (context menu, etc.)
      if (clickedInsideSelectionRef.current) {
        clickedInsideSelectionRef.current = false
        return
      }

      const wasDragging = isDraggingRef.current

      // Reset drag state
      isDraggingRef.current = false
      mouseDownTargetRef.current = null

      if (wasDragging) {
        // This was a drag (text selection), do not navigate
        return
      }

      const mouseEndX = e.clientX
      const mouseEndY = e.clientY
      const distanceX = mouseEndX - mouseStartX.current
      const distanceY = mouseEndY - mouseStartY.current
      const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)

      // Only treat as click if mouse moved less than 10px (not a drag)
      const isClick = totalDistance < CLICK_THRESHOLD

      if (!isClick) {
        // This was a drag, do not navigate
        return
      }

      // Clear any text selection
      window.getSelection()?.removeAllRanges()

      const element = contentRef.current
      if (!element) return

      const clickX = e.clientX

      if (isVertical && isPagination) {
        // Vertical pagination mode click navigation
        const prose = element.firstElementChild as HTMLElement
        if (prose) {
          const rect = element.getBoundingClientRect()
          const elementCenter = rect.left + rect.width / 2
          const scrollAmount = rect.width * SCROLL_AMOUNT_RATIO
          const edgeThreshold = 5 // pixels from edge to consider "at edge"

          const currentScrollLeft = prose.scrollLeft
          const maxScroll = prose.scrollWidth - prose.clientWidth

          // In vertical-rl mode:
          // - scrollLeft = 0: RIGHT edge content visible
          // - scrollLeft = -maxScroll: LEFT edge content visible
          const isAtRightEdge = currentScrollLeft >= -edgeThreshold
          const isAtLeftEdge = currentScrollLeft <= -(maxScroll - edgeThreshold)

          if (clickX > elementCenter) {
            // Clicked right side - scroll toward right (reading start) or go to prev page
            if (isAtRightEdge) {
              goToPrevPage()
            } else {
              // Scroll toward right edge (increase scrollLeft toward 0)
              const newScrollLeft = Math.min(0, currentScrollLeft + scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          } else {
            // Clicked left side - scroll toward left (reading end) or go to next page
            if (isAtLeftEdge) {
              goToNextPage()
            } else {
              // Scroll toward left edge (decrease scrollLeft toward -maxScroll)
              const newScrollLeft = Math.max(-maxScroll, currentScrollLeft - scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          }
        }
      } else if (isPagination) {
        // Horizontal pagination mode click navigation
        // Left/right edge = direct page navigation
        // Center area: Top half = scroll up / prev page, Bottom half = scroll down / next page
        const rect = element.getBoundingClientRect()
        const clickY = e.clientY
        const edgeZoneWidth = rect.width * HORIZONTAL_EDGE_CLICK_RATIO

        // Check if click is in left or right edge zone for direct page navigation
        if (clickX < rect.left + edgeZoneWidth) {
          // Clicked left edge - go to previous page (reading direction: left = back)
          goToPrevPage()
        } else if (clickX > rect.right - edgeZoneWidth) {
          // Clicked right edge - go to next page (reading direction: right = forward)
          goToNextPage()
        } else {
          // Clicked center area - use top/bottom half for scroll/page navigation
          const elementCenter = rect.top + rect.height / 2
          const scrollAmount = element.clientHeight * SCROLL_AMOUNT_RATIO
          const edgeThreshold = 5
          const currentScrollTop = element.scrollTop
          const maxScroll = element.scrollHeight - element.clientHeight
          const isAtBottom = currentScrollTop >= maxScroll - edgeThreshold
          const isAtTop = currentScrollTop <= edgeThreshold

          if (clickY > elementCenter) {
            // Clicked bottom half - scroll down or go to next page
            if (isAtBottom) {
              goToNextPage()
            } else {
              const newScrollTop = Math.min(maxScroll, currentScrollTop + scrollAmount)
              element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
            }
          } else {
            // Clicked top half - scroll up or go to prev page
            if (isAtTop) {
              goToPrevPage()
            } else {
              const newScrollTop = Math.max(0, currentScrollTop - scrollAmount)
              element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
            }
          }
        }
      } else if (isVertical) {
        // Vertical scroll mode click navigation
        // Scroll horizontally based on click position (left/right of center)
        const rect = element.getBoundingClientRect()
        const elementCenter = rect.left + rect.width / 2
        const scrollAmount = rect.width * SCROLL_AMOUNT_RATIO

        // Suppress scroll position saving during smooth scroll animation
        ;(isSmoothScrollingRef as { current: boolean }).current = true

        if (clickX > elementCenter) {
          // Clicked right side - scroll toward reading start (right)
          element.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        } else {
          // Clicked left side - scroll toward reading end (left)
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
      } else {
        // Horizontal scroll mode click navigation
        // Top half = scroll up, Bottom half = scroll down
        const clickY = e.clientY
        const screenCenter = window.innerHeight / 2
        const scrollAmount = window.innerHeight * SCROLL_AMOUNT_RATIO

        // Suppress scroll position saving during smooth scroll animation
        ;(isSmoothScrollingRef as { current: boolean }).current = true

        if (clickY > screenCenter) {
          // Clicked bottom half - scroll down
          window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
        } else {
          // Clicked top half - scroll up
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
      }
    },
    [
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
    ]
  )

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
