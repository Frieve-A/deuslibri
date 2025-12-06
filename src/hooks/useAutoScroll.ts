import { useEffect, useRef, useCallback, useState } from 'react'
import { AutoScrollSettings } from '@/lib/stores/useReadingStore'

interface UseAutoScrollOptions {
  autoScrollSettings: AutoScrollSettings | undefined
  isVertical: boolean
  isPagination: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
  isTocOpen: boolean
  totalPages: number
  currentPage: number
  goToNextPage: () => void
}

interface UseAutoScrollReturn {
  isPlaying: boolean
  togglePlayPause: () => void
  onUserInteraction: () => void
}

export function useAutoScroll({
  autoScrollSettings,
  isVertical,
  isPagination,
  contentRef,
  isTocOpen,
  totalPages,
  currentPage,
  goToNextPage,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)
  const scrollIntervalRef = useRef<number | null>(null)
  const delayTimeoutRef = useRef<number | null>(null)
  const pageTurnTimeoutRef = useRef<number | null>(null)
  const currentPageRef = useRef(currentPage)
  // Accumulator for sub-pixel scrolling (browsers round scrollTop/scrollLeft to integers)
  const scrollAccumulatorRef = useRef(0)

  // Keep refs in sync with state/props
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // Default settings
  const settings: AutoScrollSettings = autoScrollSettings ?? {
    enabled: false,
    speed: 50,
    startDelay: 5000,
    autoPageTurn: false,
    autoPageTurnDelay: 15000,
    userInteractionBehavior: 'pause',
  }

  // Check if content can be scrolled (with tolerance for rounding)
  const canScroll = useCallback((): boolean => {
    const container = contentRef.current
    if (!container) return false

    // Add tolerance of 2px for floating point / rounding issues
    const tolerance = 2

    if (isVertical) {
      // Vertical mode (vertical-rl): content flows from right to left
      // The container scrolls horizontally, but scrollWidth may equal clientWidth
      // if CSS minWidth: 100% is set. Check the inner content's actual width instead.
      const innerContent = container.firstElementChild as HTMLElement | null
      if (innerContent) {
        const contentWidth = innerContent.scrollWidth
        return contentWidth > container.clientWidth + tolerance
      }
      return container.scrollWidth > container.clientWidth + tolerance
    } else {
      // Horizontal mode: check vertical scroll
      return container.scrollHeight > container.clientHeight + tolerance
    }
  }, [contentRef, isVertical])

  // Check if scroll has reached the end
  const isScrollAtEnd = useCallback((): boolean => {
    const container = contentRef.current
    if (!container) return true

    // Tolerance for detecting end of scroll
    const tolerance = 2

    if (isVertical) {
      // Vertical mode (vertical-rl): reading direction is right to left
      // CRITICAL: For vertical mode, the actual scrolling element is the inner prose element
      const prose = container.firstElementChild as HTMLElement | null
      if (!prose) return true

      const contentWidth = prose.scrollWidth
      const visibleWidth = container.clientWidth
      const maxScroll = contentWidth - visibleWidth
      if (maxScroll <= tolerance) return true // Not scrollable

      // In vertical-rl, scrollLeft = 0 means RIGHT edge, scrollLeft = -maxScroll means LEFT edge
      // At the end (leftmost content visible), scrollLeft should be close to -maxScroll
      const scrollLeft = prose.scrollLeft
      const isAtLeftEdge = scrollLeft <= -(maxScroll - tolerance)
      return isAtLeftEdge
    } else {
      // Horizontal mode: reading direction is top to bottom
      const maxScroll = container.scrollHeight - container.clientHeight
      if (maxScroll <= tolerance) return true // Not scrollable
      return container.scrollTop >= maxScroll - tolerance
    }
  }, [contentRef, isVertical])

  // Perform one scroll step
  const performScroll = useCallback(() => {
    const container = contentRef.current
    if (!container) return

    // Speed is 1-100, map to actual pixels per frame (at ~60fps)
    // Use exponential scale for better control across the range
    // Speed 1 = 0.02px/frame (~1.2px/sec), Speed 50 = ~0.6px/frame (~36px/sec), Speed 100 = 15px/frame (~900px/sec)
    const minSpeed = 0.02
    const maxSpeed = 15
    // Exponential interpolation: minSpeed * (maxSpeed/minSpeed)^((speed-1)/99)
    const pixelsPerFrame = minSpeed * Math.pow(maxSpeed / minSpeed, (settings.speed - 1) / 99)

    // Accumulate sub-pixel values since browsers round scrollTop/scrollLeft to integers
    scrollAccumulatorRef.current += pixelsPerFrame

    // Only scroll when accumulated value reaches at least 1 pixel
    if (scrollAccumulatorRef.current >= 1) {
      const scrollAmount = Math.floor(scrollAccumulatorRef.current)
      scrollAccumulatorRef.current -= scrollAmount

      if (isVertical) {
        // Vertical mode (vertical-rl): scroll to continue reading
        // CRITICAL: For vertical mode, the actual scrolling element is the inner prose element
        const prose = container.firstElementChild as HTMLElement | null
        if (!prose) return

        // In vertical-rl, scrollLeft = 0 means rightmost (reading start)
        // scrollLeft = -maxScroll means leftmost (reading end)
        // To scroll in reading direction, we need scrollLeft to become MORE NEGATIVE
        const newScrollLeft = prose.scrollLeft - scrollAmount
        prose.scrollTo({ left: newScrollLeft, behavior: 'instant' })
      } else {
        // Horizontal mode: scroll down
        container.scrollTop += scrollAmount
      }
    }
  }, [contentRef, isVertical, settings.speed])

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    if (delayTimeoutRef.current) {
      window.clearTimeout(delayTimeoutRef.current)
      delayTimeoutRef.current = null
    }
    if (pageTurnTimeoutRef.current) {
      window.clearTimeout(pageTurnTimeoutRef.current)
      pageTurnTimeoutRef.current = null
    }
  }, [])

  // Start scrolling with animation frame
  const startScrolling = useCallback(() => {
    if (scrollIntervalRef.current) return

    const scroll = () => {
      // Use ref to get current value instead of closure
      if (!isPlayingRef.current) return

      const scrollable = canScroll()
      const atEnd = isScrollAtEnd()

      if (scrollable && !atEnd) {
        performScroll()
        scrollIntervalRef.current = requestAnimationFrame(scroll)
      } else {
        // Either can't scroll or reached the end
        scrollIntervalRef.current = null

        // If auto page turn is enabled and we're in pagination mode
        if (settings.autoPageTurn && isPagination && currentPageRef.current < totalPages - 1) {
          // Start page turn countdown only if not already started
          if (!pageTurnTimeoutRef.current) {
            pageTurnTimeoutRef.current = window.setTimeout(() => {
              pageTurnTimeoutRef.current = null
              if (isPlayingRef.current) {
                goToNextPage()
              }
            }, settings.autoPageTurnDelay)
          }
        }
      }
    }

    scrollIntervalRef.current = requestAnimationFrame(scroll)
  }, [canScroll, isScrollAtEnd, performScroll, settings.autoPageTurn, settings.autoPageTurnDelay, isPagination, totalPages, goToNextPage])

  // Start with delay
  const startWithDelay = useCallback(() => {
    clearAllTimers()
    // Reset scroll accumulator when starting fresh
    scrollAccumulatorRef.current = 0

    if (settings.startDelay > 0) {
      delayTimeoutRef.current = window.setTimeout(() => {
        delayTimeoutRef.current = null
        if (isPlayingRef.current) {
          startScrolling()
        }
      }, settings.startDelay)
    } else {
      startScrolling()
    }
  }, [clearAllTimers, settings.startDelay, startScrolling])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Handle user interaction
  const onUserInteraction = useCallback(() => {
    if (!settings.enabled || !isPlayingRef.current) return

    if (settings.userInteractionBehavior === 'pause') {
      // Pause on user interaction
      setIsPlaying(false)
    } else {
      // Auto resume: reset timers and restart
      clearAllTimers()
      startWithDelay()
    }
  }, [settings.enabled, settings.userInteractionBehavior, clearAllTimers, startWithDelay])

  // Auto-start when enabled is turned on
  useEffect(() => {
    if (settings.enabled) {
      setIsPlaying(true)
    } else {
      setIsPlaying(false)
    }
  }, [settings.enabled])

  // Main effect: start/stop scrolling based on isPlaying
  useEffect(() => {
    if (!settings.enabled) {
      clearAllTimers()
      return
    }

    // Don't scroll if TOC is open
    if (isTocOpen) {
      clearAllTimers()
      return
    }

    if (isPlaying) {
      startWithDelay()
    } else {
      clearAllTimers()
    }

    return () => {
      clearAllTimers()
    }
  }, [settings.enabled, isPlaying, isTocOpen, clearAllTimers, startWithDelay])

  // Reset and restart when page changes (only if playing)
  useEffect(() => {
    if (isPlayingRef.current && settings.enabled && !isTocOpen) {
      // Clear only page turn timer, let scroll restart naturally
      if (pageTurnTimeoutRef.current) {
        window.clearTimeout(pageTurnTimeoutRef.current)
        pageTurnTimeoutRef.current = null
      }
      // Small delay to let the new page content render
      const timer = window.setTimeout(() => {
        if (isPlayingRef.current) {
          // Clear and restart scrolling for the new page
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current)
            scrollIntervalRef.current = null
          }
          startWithDelay()
        }
      }, 100)
      return () => window.clearTimeout(timer)
    }
  }, [currentPage, settings.enabled, isTocOpen, startWithDelay])

  return {
    isPlaying,
    togglePlayPause,
    onUserInteraction,
  }
}
