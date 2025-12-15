/**
 * Calculate text size in "ad units" - Japanese chars count as 2 bytes, others as 1
 */
export const calculateTextSize = (text: string): number => {
  let size = 0
  for (const char of text) {
    // Japanese characters (Hiragana, Katakana, Kanji, etc.)
    if (/[\u3000-\u9FFF\uFF00-\uFFEF]/.test(char)) {
      size += 2 // Count as 2 bytes
    } else {
      size += 1 // Count as 1 byte
    }
  }
  return size
}

/**
 * Get plain text from HTML string
 */
export const getPlainTextFromHtml = (html: string): string => {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * Convert font family setting to CSS font-family value
 */
export const getFontFamilyCSS = (fontFamily: string): string => {
  switch (fontFamily) {
    case 'serif':
      return '"Times New Roman", "Georgia", "Hiragino Mincho ProN", "Yu Mincho", serif'
    case 'sans-serif':
      return '"Arial", "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
    case 'mincho':
      return '"Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", "Noto Serif JP", serif'
    case 'gothic':
      return '"Hiragino Kaku Gothic ProN", "Yu Gothic", "MS PGothic", "Noto Sans JP", sans-serif'
    case 'system':
    default:
      return 'inherit'
  }
}

/**
 * Pre-wrap KaTeX elements in HTML for vertical text mode.
 * Creates a 3-layer structure:
 * 1. math-island: horizontal-tb context (isolates from vertical parent)
 * 2. math-rotatable: handles rotation (with needs-rotation class for margin adjustment)
 * 3. .katex: the original element, modified to display: block
 *
 * This must be done at the HTML string level to avoid React reconciliation issues.
 * The rotation transform is applied here directly (no effect needed).
 * Margin adjustments are done via CSS or a separate effect that only touches margins.
 */
export const wrapKatexForVertical = (html: string): string => {
  // Create a temporary DOM element to parse the HTML
  if (typeof document === 'undefined') {
    return html // Server-side, return unchanged
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const katexElements = container.querySelectorAll('.katex')

  katexElements.forEach((katex) => {
    // Skip if inside a table
    if (katex.closest('table')) {
      return
    }

    // Skip if already wrapped
    if (katex.closest('.math-island')) {
      return
    }

    // Create wrapper structure
    const island = document.createElement('span')
    island.className = 'math-island'
    island.style.writingMode = 'horizontal-tb'
    island.style.textOrientation = 'mixed'
    island.style.display = 'inline-block'

    const rotatable = document.createElement('span')
    rotatable.className = 'math-rotatable'
    rotatable.style.display = 'inline-block'
    rotatable.style.lineHeight = '0'
    // Apply rotation transform here in the HTML preprocessing
    // This ensures it survives React re-renders
    rotatable.style.transform = 'rotate(90deg)'
    rotatable.style.transformOrigin = 'center center'
    // Use data attribute to mark elements that need margin adjustment
    rotatable.dataset.needsMargin = 'true'

    // Insert structure
    katex.parentNode?.insertBefore(island, katex)
    island.appendChild(rotatable)
    rotatable.appendChild(katex)

    // Set katex to block
    ;(katex as HTMLElement).style.display = 'block'
  })

  return container.innerHTML
}

/**
 * Check if a point is inside the current text selection
 */
export const isPointInsideSelection = (x: number, y: number): boolean => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false
  }
  const range = selection.getRangeAt(0)
  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true
    }
  }
  return false
}
