import { useEffect, useRef, useCallback, useState } from 'react'
import { AutoScrollSettings } from '@/lib/stores/useReadingStore'
import { resolveReaderScrollTarget, type ReaderScrollTarget } from '@/lib/reader/visiblePage'

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
  stop: () => void
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
  const pageRestartTimeoutRef = useRef<number | null>(null)
  const externallyStoppedRef = useRef(false)
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

  // Perform one scroll step
  const performScroll = useCallback((target: ReaderScrollTarget) => {
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

      target.scrollTo(Math.min(target.maxPosition, target.position + scrollAmount))
    }
  }, [settings.speed])

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
    if (pageRestartTimeoutRef.current !== null) {
      window.clearTimeout(pageRestartTimeoutRef.current)
      pageRestartTimeoutRef.current = null
    }
  }, [])

  // Synchronous exclusion: the speech user gesture cancels every pending motion.
  const stop = useCallback(() => {
    externallyStoppedRef.current = true
    isPlayingRef.current = false
    clearAllTimers()
    setIsPlaying(false)
  }, [clearAllTimers])

  // Start scrolling with animation frame
  const startScrolling = useCallback(() => {
    if (scrollIntervalRef.current) return

    const scroll = () => {
      // Use ref to get current value instead of closure
      if (!isPlayingRef.current || externallyStoppedRef.current) return

      const target = resolveReaderScrollTarget(contentRef.current, isVertical, isPagination)
      if (target && target.maxPosition > 2 && target.position < target.maxPosition - 2) {
        performScroll(target)
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
  }, [contentRef, isVertical, performScroll, settings.autoPageTurn, settings.autoPageTurnDelay, isPagination, totalPages, goToNextPage])

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
    externallyStoppedRef.current = false
    isPlayingRef.current = !isPlayingRef.current
    setIsPlaying(isPlayingRef.current)
  }, [])

  // Handle user interaction
  const onUserInteraction = useCallback(() => {
    if (!settings.enabled || !isPlayingRef.current || externallyStoppedRef.current) return

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
    if (settings.enabled && !externallyStoppedRef.current) {
      setIsPlaying(true)
    } else {
      setIsPlaying(false)
    }
  }, [settings.enabled])

  // Main effect: start/stop scrolling based on isPlaying
  useEffect(() => {
    if (!settings.enabled || externallyStoppedRef.current) {
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
    if (isPlayingRef.current && settings.enabled && !isTocOpen && !externallyStoppedRef.current) {
      // Clear only page turn timer, let scroll restart naturally
      if (pageTurnTimeoutRef.current) {
        window.clearTimeout(pageTurnTimeoutRef.current)
        pageTurnTimeoutRef.current = null
      }
      // Small delay to let the new page content render
      pageRestartTimeoutRef.current = window.setTimeout(() => {
        pageRestartTimeoutRef.current = null
        if (isPlayingRef.current) {
          // Clear and restart scrolling for the new page
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current)
            scrollIntervalRef.current = null
          }
          startWithDelay()
        }
      }, 100)
      return () => {
        if (pageRestartTimeoutRef.current !== null) window.clearTimeout(pageRestartTimeoutRef.current)
        pageRestartTimeoutRef.current = null
      }
    }
  }, [currentPage, settings.enabled, isTocOpen, startWithDelay])

  return {
    isPlaying,
    togglePlayPause,
    onUserInteraction,
    stop,
  }
}
