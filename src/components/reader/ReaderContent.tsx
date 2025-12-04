'use client'

import { RefObject, useMemo } from 'react'
// import AdSense from '../AdSense'  // TEMPORARILY DISABLED
import {
  AD_THRESHOLD_BYTES,
  calculateTextSize,
  getPlainTextFromHtml,
  getFontFamilyCSS,
} from '@/lib/reader'
import type { FontFamily } from '@/lib/stores/useReadingStore'

interface ReaderContentProps {
  pageHtml: string[]
  currentPage: number
  isVertical: boolean
  isPagination: boolean
  fontSize: number
  fontFamily: FontFamily
  contentRef: RefObject<HTMLDivElement | null>
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => void
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUp: (e: React.MouseEvent) => void
}

export function ReaderContent({
  pageHtml,
  currentPage,
  isVertical,
  isPagination,
  fontSize,
  fontFamily,
  contentRef,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: ReaderContentProps) {
  const fontFamilyCSS = getFontFamilyCSS(fontFamily)
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
    return (
      <div className="max-w-6xl mx-auto h-full flex flex-col">
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
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            height: 'calc(100vh - 180px)' /* Header + Footer height (Ad disabled) */,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            touchAction: 'pan-x' /* Enable horizontal touch scroll */,
          }}
        >
          <div
            className="prose dark:prose-invert h-full inline-block p-8"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamilyCSS,
              writingMode: 'vertical-rl',
              minWidth: '100%',
              width: 'fit-content',
            }}
            dangerouslySetInnerHTML={{ __html: pageHtml[currentPage] }}
          />
        </div>
      </div>
    )
  }

  if (isVertical && !isPagination) {
    /* Vertical scroll mode - Japanese vertical writing with infinite scroll */
    /* In vertical-rl mode, content flows from right to left naturally */
    /* All pages are concatenated into a single vertical-rl block */
    return (
      <div className="max-w-6xl mx-auto h-full flex flex-col">
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
          className="overflow-x-auto overflow-y-hidden flex-1"
          style={{
            height: 'calc(100vh - 80px)' /* Header height (Ad disabled) */,
            touchAction: 'pan-x' /* Enable horizontal touch scroll */,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            className="prose dark:prose-invert max-w-none p-4 sm:p-8"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamilyCSS,
              writingMode: 'vertical-rl',
              height: '100%',
              width: 'max-content',
            }}
            dangerouslySetInnerHTML={{
              __html: pageHtml
                .map(
                  (html, index) =>
                    `<div id="scroll-page-${index}" style="display: inline-block; height: 100%; vertical-align: top;">${html}</div>${
                      index < pageHtml.length - 1
                        ? '<div style="display: inline-block; width: 2px; height: 100%; background: #d1d5db; margin: 0 1.5rem; vertical-align: top;"></div>'
                        : ''
                    }`
                )
                .join(''),
            }}
          />
        </div>
      </div>
    )
  }

  /* Horizontal mode (pagination or scroll) */
  return (
    <div
      key="horizontal-content"
      ref={contentRef}
      className={isPagination ? 'fixed inset-x-0 overflow-y-auto' : 'pb-24'}
      style={isPagination ? { top: '80px', bottom: '100px' } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {isPagination ? (
          /* Pagination Mode */
          <>
            <div
              className="prose dark:prose-invert max-w-none"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamilyCSS,
                writingMode: 'horizontal-tb',
              }}
              dangerouslySetInnerHTML={{ __html: pageHtml[currentPage] }}
            />
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
          </>
        ) : (
          /* Horizontal Scroll Mode */
          <div
            className="prose dark:prose-invert max-w-none"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamilyCSS,
              writingMode: 'horizontal-tb',
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
                  <hr className="my-8 border-t-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
