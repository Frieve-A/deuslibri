import { useRef, useEffect, useCallback, RefObject } from 'react'

interface UseProgressBarOptions {
  totalPages: number
  isVertical: boolean
  loading: boolean
  onNavigate: (page: number, source: 'user') => void
}

interface UseProgressBarReturn {
  progressBarRef: RefObject<HTMLDivElement | null>
  handleProgressBarMouseDown: (e: React.MouseEvent) => void
}

export function useProgressBar({
  totalPages,
  isVertical,
  loading,
  onNavigate,
}: UseProgressBarOptions): UseProgressBarReturn {
  const progressBarRef = useRef<HTMLDivElement>(null)
  const isDraggingProgressRef = useRef<boolean>(false)

  const calculatePageFromPosition = useCallback(
    (clientX: number): number => {
      if (!progressBarRef.current) return 0
      const rect = progressBarRef.current.getBoundingClientRect()
      let ratio = (clientX - rect.left) / rect.width
      // For vertical mode, progress bar is reversed (right to left)
      if (isVertical) {
        ratio = 1 - ratio
      }
      ratio = Math.max(0, Math.min(1, ratio))
      return Math.round(ratio * (totalPages - 1))
    },
    [totalPages, isVertical]
  )

  const handleProgressBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDraggingProgressRef.current = true
      const newPage = calculatePageFromPosition(e.clientX)
      onNavigate(newPage, 'user')

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDraggingProgressRef.current) {
          const newPage = calculatePageFromPosition(moveEvent.clientX)
          onNavigate(newPage, 'user')
        }
      }

      const handleMouseUp = () => {
        isDraggingProgressRef.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [calculatePageFromPosition, onNavigate]
  )

  // Progress bar touch handlers using native events to allow preventDefault on passive listeners
  useEffect(() => {
    const progressBar = progressBarRef.current
    if (!progressBar || loading) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isDraggingProgressRef.current = true
      const touch = e.touches[0]
      const newPage = calculatePageFromPosition(touch.clientX)
      onNavigate(newPage, 'user')
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingProgressRef.current) {
        e.preventDefault()
        e.stopPropagation()
        const touch = e.touches[0]
        const newPage = calculatePageFromPosition(touch.clientX)
        onNavigate(newPage, 'user')
      }
    }

    const handleTouchEnd = () => {
      isDraggingProgressRef.current = false
    }

    progressBar.addEventListener('touchstart', handleTouchStart, { passive: false })
    progressBar.addEventListener('touchmove', handleTouchMove, { passive: false })
    progressBar.addEventListener('touchend', handleTouchEnd)

    return () => {
      progressBar.removeEventListener('touchstart', handleTouchStart)
      progressBar.removeEventListener('touchmove', handleTouchMove)
      progressBar.removeEventListener('touchend', handleTouchEnd)
    }
  }, [totalPages, isVertical, loading, calculatePageFromPosition, onNavigate])

  return {
    progressBarRef,
    handleProgressBarMouseDown,
  }
}
