'use client'

import { RefObject, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
// import AdSense from '../AdSense'  // TEMPORARILY DISABLED
import {
  AD_THRESHOLD_BYTES,
  calculateTextSize,
  getPlainTextFromHtml,
  getFontFamilyCSS,
  wrapKatexForVertical,
  convertHeadingDigitsToFullWidth,
} from '@/lib/reader'
import type { FontFamily } from '@/lib/stores/useReadingStore'

type MarginSize = 'small' | 'medium' | 'large'
type Theme = 'light' | 'dark' | 'sepia' | 'auto'

interface ReaderContentProps {
  pageHtml: string[]
  currentPage: number
  isVertical: boolean
  isPagination: boolean
  fontSize: number
  fontFamily: FontFamily
  lineHeight: number
  marginSize: MarginSize
  theme: Theme
  contentRef: RefObject<HTMLDivElement | null>
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: (e: React.MouseEvent) => void
}

// Convert margin size to CSS padding values for vertical mode
function getVerticalMarginPadding(marginSize: MarginSize): string {
  const margins = {
    small: '0.5rem 1rem',
    medium: '1rem 2rem',
    large: '1.5rem 3rem',
  }
  return margins[marginSize]
}

// Convert margin size to max-width class for horizontal mode
function getHorizontalMaxWidth(marginSize: MarginSize): string {
  const widths = {
    small: 'max-w-7xl', // wider content
    medium: 'max-w-4xl', // default
    large: 'max-w-2xl', // narrower content, more margin
  }
  return widths[marginSize]
}

// Get prose classes based on theme
function getProseClasses(theme: Theme): string {
  switch (theme) {
    case 'sepia':
      return 'prose prose-amber' // Use amber prose for sepia theme
    case 'dark':
      return 'prose prose-invert'
    case 'light':
      return 'prose'
    default: // 'auto'
      return 'prose dark:prose-invert'
  }
}

// Get divider color based on theme
function getDividerColor(theme: Theme): string {
  switch (theme) {
    case 'sepia':
      return '#d4a574' // Warm amber/brown for sepia
    case 'dark':
      return '#4b5563' // Gray-600 for dark mode
    case 'light':
      return '#d1d5db' // Gray-300 for light mode
    default: // 'auto'
      return '#d1d5db' // Default to light mode color
  }
}

// Get gradient color based on theme (color that contrasts with background for visibility)
function getGradientColor(theme: Theme): string {
  switch (theme) {
    case 'sepia':
      return 'rgba(139, 90, 43, 0.15)' // Darker sepia tone for contrast
    case 'dark':
      return 'rgba(255, 255, 255, 0.1)' // Light color for dark mode
    case 'light':
      return 'rgba(0, 0, 0, 0.08)' // Dark color for light mode
    default: // 'auto'
      return 'rgba(0, 0, 0, 0.08)'
  }
}

// Build exponential gradient color stops for a more natural fade effect
// Gradient is slow at start and rapid change at the edge
function buildExpGradient(direction: string, color: string): string {
  // Exponential curve: opacity increases slowly then rapidly at the end
  // Using color-stop percentages to simulate exp curve
  const stops = [
    `transparent 0%`,
    `${color.replace(/[\d.]+\)$/, '0.01)')} 50%`,
    `${color.replace(/[\d.]+\)$/, '0.02)')} 70%`,
    `${color.replace(/[\d.]+\)$/, '0.04)')} 85%`,
    `${color.replace(/[\d.]+\)$/, '0.06)')} 92%`,
    `${color} 100%`,
  ]
  return `linear-gradient(${direction}, ${stops.join(', ')})`
}

// Inline scroll edge gradient component - placed inside scrollable content at edges
interface ScrollEdgeGradientProps {
  position: 'start' | 'end'
  direction: 'horizontal' | 'vertical'
  theme: Theme
}

function ScrollEdgeGradient({ position, direction, theme }: ScrollEdgeGradientProps) {
  const bgColor = getGradientColor(theme)
  const isAuto = theme === 'auto'
  const lightModeColor = 'rgba(0, 0, 0, 0.12)'
  const darkModeColor = 'rgba(255, 255, 255, 0.15)'

  // For vertical scroll (horizontal text mode)
  // - "start" gradient at top (beginning of scroll): transparent at top edge, fades to color toward content
  // - "end" gradient at bottom (end of scroll): transparent at bottom edge, fades to color toward content
  // This matches the visual style of vertical text mode where gradient color is toward content
  // Use negative margins to extend beyond padding to screen edge
  const baseStyle: React.CSSProperties = {
    display: 'block',
    width: '100vw',
    height: '40px',
    flexShrink: 0,
    pointerEvents: 'none',
    marginLeft: 'calc(-50vw + 50%)',
    marginRight: 'calc(-50vw + 50%)',
  }

  // For start (top): transparent at top (0%), color toward content (100%)
  // For end (bottom): transparent at bottom (0%), color toward content (100%)
  const gradientDir = position === 'start' ? 'to bottom' : 'to top'

  if (isAuto) {
    return (
      <>
        <div
          style={{ ...baseStyle, background: buildExpGradient(gradientDir, lightModeColor) }}
          className="dark:hidden"
        />
        <div
          style={{ ...baseStyle, background: buildExpGradient(gradientDir, darkModeColor) }}
          className="hidden dark:block"
        />
      </>
    )
  }

  return (
    <div style={{ ...baseStyle, background: buildExpGradient(gradientDir, bgColor) }} />
  )
}

// Build inline gradient HTML for vertical text mode (horizontal scroll)
// Returns HTML string to be inserted into dangerouslySetInnerHTML
function buildVerticalGradientHtml(position: 'start' | 'end', theme: Theme): string {
  const lightModeColor = 'rgba(0, 0, 0, 0.12)'
  const darkModeColor = 'rgba(255, 255, 255, 0.15)'
  const bgColor = getGradientColor(theme)
  const isAuto = theme === 'auto'

  // In vertical-rl mode, content flows right-to-left
  // - "start" is at the RIGHT edge of the scroll area (beginning)
  // - "end" is at the LEFT edge of the scroll area (end)
  // Gradient direction: color at the edge, transparent toward content
  // - start (right): color at right edge -> transparent toward left (to left)
  // - end (left): color at left edge -> transparent toward right (to right)
  const gradientDir = position === 'start' ? 'to left' : 'to right'

  // Use 100vh height with negative margins to extend beyond padding to screen edge
  const baseStyle = `
    display: inline-block;
    width: 40px;
    height: 100vh;
    vertical-align: top;
    pointer-events: none;
    flex-shrink: 0;
    margin-top: calc(-50vh + 50%);
    margin-bottom: calc(-50vh + 50%);
  `.replace(/\n/g, ' ')

  // Add margin on the content side to create spacing between gradient and content
  // In vertical-rl mode: start is on right, so margin-left pushes content away
  // end is on left, so margin-right pushes content away
  // Start (beginning) needs more space, end (tail) needs less
  const marginStyle = position === 'start' ? 'margin-left: 1.5rem;' : 'margin-right: 0.5rem;'

  if (isAuto) {
    // For auto mode, use CSS class-based dark mode switching
    return `
      <div style="${baseStyle} ${marginStyle} background: ${buildExpGradient(gradientDir, lightModeColor)};" class="gradient-light"></div>
      <div style="${baseStyle} ${marginStyle} background: ${buildExpGradient(gradientDir, darkModeColor)};" class="gradient-dark"></div>
    `
  }

  return `<div style="${baseStyle} ${marginStyle} background: ${buildExpGradient(gradientDir, bgColor)};"></div>`
}

export function ReaderContent({
  pageHtml,
  currentPage,
  isVertical,
  isPagination,
  fontSize,
  fontFamily,
  lineHeight,
  marginSize,
  theme,
  contentRef,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: ReaderContentProps) {
  const fontFamilyCSS = getFontFamilyCSS(fontFamily)
  const verticalMarginPadding = getVerticalMarginPadding(marginSize)
  const horizontalMaxWidth = getHorizontalMaxWidth(marginSize)
  const proseClasses = getProseClasses(theme)

  // Pre-process HTML for vertical mode - wrap KaTeX elements and convert heading digits
  // This avoids React reconciliation overwriting our DOM modifications
  const processedPageHtml = useMemo(() => {
    if (!isVertical) {
      return pageHtml
    }
    return pageHtml.map((html) => {
      let processed = wrapKatexForVertical(html)
      processed = convertHeadingDigitsToFullWidth(processed)
      return processed
    })
  }, [pageHtml, isVertical])

  // Track the current page being displayed - used to verify rAF callbacks are for the correct page
  const currentPageRef = useRef<number>(currentPage)
  currentPageRef.current = currentPage

  // Effect to apply margin adjustments to pre-wrapped/rotated KaTeX elements in vertical mode
  // The wrapper structure AND rotation transform are already in the HTML from wrapKatexForVertical()
  // This effect only needs to:
  // 1. Force reflow to get accurate measurements
  // 2. Calculate and apply margin adjustments based on element dimensions
  // 3. Show content by setting opacity to 1
  // Use useLayoutEffect to apply margin adjustments BEFORE browser paints
  // This prevents visual flicker from unprocessed KaTeX elements
  // The effect runs after every render to handle React re-renders that replace the DOM
  useLayoutEffect(() => {
    // For non-vertical mode, no margin adjustment needed
    if (!isVertical) {
      return
    }

    // Skip if page content is not yet loaded (e.g., during initial loading)
    const currentProcessedHtml = processedPageHtml[currentPage]
    if (!currentProcessedHtml || currentProcessedHtml.length === 0) {
      return
    }

    const container = contentRef.current
    if (!container) {
      return
    }

    const proseElement = container.querySelector('.prose') as HTMLElement | null
    if (!proseElement) {
      return
    }

    // Find all rotatable elements (always apply margins since DOM may have been re-created)
    const rotatables = container.querySelectorAll('.math-rotatable') as NodeListOf<HTMLElement>

    // Force reflow so KaTeX elements have correct measurements in horizontal context
    if (rotatables.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      container.offsetHeight
    }

    // Apply margin calculations
    rotatables.forEach((rotatable) => {
      const katex = rotatable.querySelector('.katex') as HTMLElement
      if (!katex) {
        return
      }

      const width = katex.offsetWidth
      const height = katex.offsetHeight

      const diff = width - height
      rotatable.style.marginLeft = `${-diff / 2}px`
      rotatable.style.marginRight = `${-diff / 2}px`
      rotatable.style.marginTop = `${diff / 2}px`
      rotatable.style.marginBottom = `${diff / 2}px`
    })

    // Show content - KaTeX margin adjustment is complete (or no KaTeX elements existed)
    // Set both visibility and opacity to prevent image flicker during page change
    proseElement.style.visibility = 'visible'
    proseElement.style.opacity = '1'

    // Dispatch event to signal that KaTeX processing is complete
    window.dispatchEvent(new CustomEvent('katex-rotation-complete'))
  })

  // Effect for horizontal pagination mode - fade in content after render
  // No KaTeX rotation needed, just show content with smooth transition
  useEffect(() => {
    // Only for horizontal pagination mode
    if (isVertical || !isPagination) {
      return
    }

    const showContent = () => {
      if (!contentRef.current) return
      // Find the container with key={`prose-${currentPage}`}
      const contentContainer = contentRef.current.querySelector('[class*="pt-2"]') as HTMLElement
      if (contentContainer) {
        contentContainer.style.opacity = '1'
      }
    }

    // Run after DOM is updated
    const timer = setTimeout(() => {
      requestAnimationFrame(showContent)
    }, 50)
    return () => clearTimeout(timer)
  }, [isVertical, isPagination, contentRef, currentPage, pageHtml])

  // Calculate which page indices should show ads based on accumulated text size
  // Ads appear after accumulating AD_THRESHOLD_BYTES (10000 bytes) of text
  // Japanese characters count as 2 bytes, so 5000 Japanese chars = 10000 bytes
  const adPageIndices = useMemo(() => {
    const indices: Set<number> = new Set()
    let accumulatedSize = 0

    for (let i = 0; i < pageHtml.length; i++) {
      const plainText = getPlainTextFromHtml(pageHtml[i])
      accumulatedSize += calculateTextSize(plainText)

      // Show ad after this page if accumulated size exceeds threshold
      if (accumulatedSize >= AD_THRESHOLD_BYTES) {
        indices.add(i)
        accumulatedSize = 0 // Reset counter after showing ad
      }
    }

    return indices
  }, [pageHtml])

  if (isVertical && isPagination) {
    /* Vertical pagination mode - scrollable content area */
    /*
     * Layout: Fixed height container that fills viewport minus header and footer.
     * Only the inner container scrolls horizontally.
     * Outer containers have overflow:hidden to prevent any scrollbars on html/body.
     */
    // Build content with gradient edges embedded in the HTML
    // Use processedPageHtml which has KaTeX already wrapped for vertical mode
    const startGradient = buildVerticalGradientHtml('start', theme)
    const endGradient = buildVerticalGradientHtml('end', theme)
    const contentWithGradients = `${startGradient}${processedPageHtml[currentPage]}${endGradient}`

    return (
      <div className="fixed inset-x-0 top-[80px] bottom-[92px] overflow-hidden">
        <div className="h-full w-full max-w-6xl mx-auto">
          {/* Ad below header for vertical mode - refreshes on page change - TEMPORARILY DISABLED
          <div className="px-4 py-2 flex-shrink-0">
            <AdSense
              key={`vertical-ad-${currentPage}`}
              adSlot="1234567894"
              adFormat="horizontal"
              style={{ display: 'block', minHeight: '60px' }}
            />
          </div>
          */}
          <div
            key="vertical-content"
            ref={contentRef}
            className="h-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-start',
              touchAction: 'pan-x' /* Enable horizontal touch scroll */,
              containerType: 'size' /* Enable container query units for image sizing */,
            }}
          >
            <div
              key={`prose-${currentPage}`}
              className={`${proseClasses} h-full inline-block overflow-x-scroll custom-scrollbar`}
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamilyCSS,
                lineHeight: lineHeight,
                padding: verticalMarginPadding,
                writingMode: 'vertical-rl',
                minWidth: '100%',
                width: 'fit-content',
                visibility: 'hidden',
                opacity: 0,
                transition: 'opacity 0.15s ease-in',
              }}
              dangerouslySetInnerHTML={{ __html: contentWithGradients }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (isVertical && !isPagination) {
    /* Vertical scroll mode - Japanese vertical writing with infinite scroll */
    /* In vertical-rl mode, content flows from right to left naturally */
    /* All pages are concatenated into a single vertical-rl block */
    /*
     * Layout: Fixed height container that fills viewport minus header.
     * Only the inner container scrolls horizontally.
     * Outer containers have overflow:hidden to prevent any scrollbars on html/body.
     */
    return (
      <div className="fixed inset-x-0 top-[80px] bottom-0 overflow-hidden">
        <div className="h-full w-full max-w-6xl mx-auto">
          {/* Ad below header for vertical scroll mode - TEMPORARILY DISABLED
          <div className="px-4 py-2 flex-shrink-0">
            <AdSense
              adSlot="1234567894"
              adFormat="horizontal"
              style={{ display: 'block', minHeight: '60px' }}
            />
          </div>
          */}
          <div
            key="vertical-scroll-content"
            ref={contentRef}
            className="h-full overflow-x-scroll overflow-y-hidden custom-scrollbar"
            style={{
              touchAction: 'pan-x' /* Enable horizontal touch scroll */,
              containerType: 'size' /* Enable container query units for image sizing */,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div
              className={`${proseClasses} max-w-none`}
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamilyCSS,
                lineHeight: lineHeight,
                padding: verticalMarginPadding,
                writingMode: 'vertical-rl',
                height: '100%',
                width: 'max-content',
                visibility: 'hidden',
                opacity: 0,
                transition: 'opacity 0.15s ease-in',
              }}
              dangerouslySetInnerHTML={{
                __html: processedPageHtml
                  .map(
                    (html, index) =>
                      `<div id="scroll-page-${index}" style="display: inline-block; height: 100%; vertical-align: top;">${html}</div>${
                        index < processedPageHtml.length - 1
                          ? `<div style="display: inline-block; width: 2px; height: 100%; background: ${getDividerColor(theme)}; margin: 0 1.5rem; vertical-align: top;"></div>`
                          : ''
                      }`
                  )
                  .join(''),
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  /* Horizontal mode (pagination or scroll) */
  if (isPagination) {
    /* Horizontal pagination mode - vertical scrolling */
    return (
      <div className="fixed inset-x-0 top-[80px] bottom-[100px] overflow-hidden">
        <div className="h-full w-full">
          <div
            key="horizontal-content"
            ref={contentRef}
            className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
            style={{ overscrollBehavior: 'contain' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className={`${horizontalMaxWidth} mx-auto px-4 sm:px-8`}>
              {/* Start edge gradient (top - beginning of vertical scroll) */}
              <ScrollEdgeGradient position="start" direction="vertical" theme={theme} />
              <div
                key={`prose-${currentPage}`}
                className="pt-2 sm:pt-4 pb-4 sm:pb-8"
                style={{
                  opacity: 0,
                  transition: 'opacity 0.15s ease-in',
                }}
              >
                <div
                  className={`${proseClasses} max-w-none`}
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: fontFamilyCSS,
                    lineHeight: lineHeight,
                    writingMode: 'horizontal-tb',
                  }}
                  dangerouslySetInnerHTML={{ __html: pageHtml[currentPage] }}
                />
              </div>
              {/* Ad at page bottom when accumulated text exceeds 10000 bytes threshold - TEMPORARILY DISABLED
              {adPageIndices.has(currentPage) && (
                <div className="mt-8">
                  <AdSense
                    key={`pagination-ad-${currentPage}`}
                    adSlot="1234567893"
                    adFormat="horizontal"
                    style={{ display: 'block', minHeight: '90px' }}
                  />
                </div>
              )}
              */}
              {/* End edge gradient (bottom - end of vertical scroll) */}
              <ScrollEdgeGradient position="end" direction="vertical" theme={theme} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* Horizontal scroll mode */
  // Effect to show content after scroll restoration completes
  useEffect(() => {
    // Only for horizontal scroll mode (non-pagination)
    if (isVertical || isPagination) {
      return
    }

    const showContent = () => {
      if (!contentRef.current) return
      const proseElement = contentRef.current.querySelector('.prose') as HTMLElement
      if (proseElement) {
        proseElement.style.opacity = '1'
      }
    }

    // Listen for scroll-restoration-complete event from useBookProgress
    window.addEventListener('scroll-restoration-complete', showContent, { once: true })

    // Fallback: show content after timeout in case event doesn't fire
    const fallbackTimer = setTimeout(showContent, 300)

    return () => {
      window.removeEventListener('scroll-restoration-complete', showContent)
      clearTimeout(fallbackTimer)
    }
  }, [isVertical, isPagination, contentRef, pageHtml])

  return (
    <div
      key="horizontal-content"
      ref={contentRef}
      className="pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className={`${horizontalMaxWidth} mx-auto p-4 sm:p-8`}>
        <div
          className={`${proseClasses} max-w-none`}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: fontFamilyCSS,
            lineHeight: lineHeight,
            writingMode: 'horizontal-tb',
            opacity: 0,
            transition: 'opacity 0.15s ease-in',
          }}
        >
          {pageHtml.map((html, index) => (
            <div key={index} id={`scroll-page-${index}`}>
              <div dangerouslySetInnerHTML={{ __html: html }} className="mb-8" />
              {/* Ad before page divider for pages that exceed the character threshold - TEMPORARILY DISABLED
              {adPageIndices.has(index) && index < pageHtml.length - 1 && (
                <div className="my-4">
                  <AdSense
                    adSlot="1234567895"
                    adFormat="horizontal"
                    style={{ display: 'block', minHeight: '60px' }}
                  />
                </div>
              )}
              */}
              {/* Page divider */}
              {index < pageHtml.length - 1 && (
                <hr className={`my-8 border-t-2 ${
                  theme === 'sepia'
                    ? 'border-amber-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
