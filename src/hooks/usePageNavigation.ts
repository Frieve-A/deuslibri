import { useCallback, useEffect, useRef, RefObject } from 'react'
import { SCROLL_AMOUNT_RATIO } from '@/lib/reader'

interface UsePageNavigationOptions {
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  displayMode: 'pagination' | 'scroll'
  contentRef: RefObject<HTMLDivElement | null>
  isVertical?: boolean
}

interface UsePageNavigationReturn {
  goToNextPage: () => void
  goToPrevPage: () => void
  navigationDirectionRef: RefObject<'next' | 'prev' | null>
}

export function usePageNavigation({
  currentPage,
  setCurrentPage,
  totalPages,
  displayMode,
  contentRef,
  isVertical = true,
}: UsePageNavigationOptions): UsePageNavigationReturn {
  const navigationDirectionRef = useRef<'next' | 'prev' | null>(null)

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      navigationDirectionRef.current = 'next'
      setCurrentPage(currentPage + 1)
      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Also reset content container scroll for horizontal pagination mode
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [currentPage, totalPages, setCurrentPage, contentRef])

  const goToPrevPage = useCallback(() => {
    if (currentPage > 0) {
      navigationDirectionRef.current = 'prev'
      setCurrentPage(currentPage - 1)
      // Scroll position is handled by useVerticalLayout hook
      // which sets appropriate position based on navigation direction
      // (縦書き: 左端へ, 横書き: 下端へ)
    }
  }, [currentPage, setCurrentPage])

  // Keyboard navigation with scroll support
  // Same logic as tap/click: scroll within page first, then navigate to next/prev page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 矢印キーの場合はブラウザのデフォルトスクロールを防止
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
      }

      const element = contentRef.current
      if (!element) return

      const isPagination = displayMode === 'pagination'

      if (isVertical) {
        if (isPagination) {
          // 縦書きページネーションモード
          const prose = element.firstElementChild as HTMLElement
          if (!prose) return

          const scrollAmount = element.clientWidth * SCROLL_AMOUNT_RATIO
          const currentScrollLeft = prose.scrollLeft
          const maxScroll = prose.scrollWidth - prose.clientWidth
          const edgeThreshold = 5

          // vertical-rl mode:
          // - scrollLeft = 0: 右端コンテンツが表示（読み始め）
          // - scrollLeft = -maxScroll: 左端コンテンツが表示（読み終わり）
          const isAtRightEdge = currentScrollLeft >= -edgeThreshold
          const isAtLeftEdge = currentScrollLeft <= -(maxScroll - edgeThreshold)

          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            // 左キー/下キー: 読み進める方向（左端へ向かう）
            if (isAtLeftEdge) {
              goToNextPage()
            } else {
              // 左端へスクロール（scrollLeftを減少）
              const newScrollLeft = Math.max(-maxScroll, currentScrollLeft - scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            // 右キー/上キー: 戻る方向（右端へ向かう）
            if (isAtRightEdge) {
              goToPrevPage()
            } else {
              // 右端へスクロール（scrollLeftを増加して0に近づける）
              const newScrollLeft = Math.min(0, currentScrollLeft + scrollAmount)
              prose.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            }
          }
        } else {
          // 縦書き無限スクロールモード
          const scrollAmount = element.clientWidth * SCROLL_AMOUNT_RATIO

          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            // 左キー/下キー: 読み進める方向（左へスクロール）
            element.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            // 右キー/上キー: 戻る方向（右へスクロール）
            element.scrollBy({ left: scrollAmount, behavior: 'smooth' })
          }
        }
      } else {
        if (isPagination) {
          // 横書きページネーションモード
          const scrollAmount = element.clientHeight * SCROLL_AMOUNT_RATIO
          const currentScrollTop = element.scrollTop
          const maxScroll = element.scrollHeight - element.clientHeight
          const edgeThreshold = 5
          const isAtBottom = currentScrollTop >= maxScroll - edgeThreshold
          const isAtTop = currentScrollTop <= edgeThreshold

          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            if (isAtBottom) {
              goToNextPage()
            } else {
              const newScrollTop = Math.min(maxScroll, currentScrollTop + scrollAmount)
              element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
            }
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            if (isAtTop) {
              goToPrevPage()
            } else {
              const newScrollTop = Math.max(0, currentScrollTop - scrollAmount)
              element.scrollTo({ top: newScrollTop, behavior: 'smooth' })
            }
          }
        } else {
          // 横書き無限スクロールモード
          const scrollAmount = window.innerHeight * SCROLL_AMOUNT_RATIO

          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            window.scrollBy({ top: -scrollAmount, behavior: 'smooth' })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayMode, contentRef, isVertical, goToNextPage, goToPrevPage])

  return {
    goToNextPage,
    goToPrevPage,
    navigationDirectionRef,
  }
}
