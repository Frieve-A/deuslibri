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
 * Convert half-width digits and dots to full-width for vertical text
 */
const toFullWidthForVertical = (str: string): string => {
  return str.replace(/[0-9.]/g, (char) => {
    if (char === '.') {
      return '．' // Full-width dot
    }
    return String.fromCharCode(char.charCodeAt(0) + 0xFEE0)
  })
}

/**
 * Convert half-width digits to full-width in heading elements (h1-h6) for vertical text mode.
 * In vertical Japanese text, full-width digits look more natural in headings.
 */
export const convertHeadingDigitsToFullWidth = (html: string): string => {
  if (typeof document === 'undefined') {
    return html // Server-side, return unchanged
  }

  const container = document.createElement('div')
  container.innerHTML = html

  // Find all heading elements
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')

  headings.forEach((heading) => {
    // Process text nodes within the heading
    const walker = document.createTreeWalker(
      heading,
      NodeFilter.SHOW_TEXT,
      null
    )

    const textNodes: Text[] = []
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      textNodes.push(node)
    }

    textNodes.forEach((textNode) => {
      if (textNode.textContent) {
        textNode.textContent = toFullWidthForVertical(textNode.textContent)
      }
    })
  })

  return container.innerHTML
}

const SHORT_ALPHANUMERIC_TOKEN = /(^|[^A-Za-z0-9])([A-Za-z0-9]{1,2})(?=$|[^A-Za-z0-9])/g
const HAS_SHORT_ALPHANUMERIC_TOKEN = /(^|[^A-Za-z0-9])([A-Za-z0-9]{1,2})(?=$|[^A-Za-z0-9])/
const TATE_CHU_YOKO_SKIP_SELECTOR = [
  'script',
  'style',
  'textarea',
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'table',
  '.katex',
  '.math-island',
  '.math-rotatable',
  '.tate-chu-yoko',
].join(',')

/**
 * Wrap standalone half-width alphanumeric tokens of up to 2 characters for tate-chu-yoko.
 */
export const applyTateChuYokoToShortAlphanumerics = (html: string): string => {
  if (typeof document === 'undefined') {
    return html // Server-side, return unchanged
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent || parent.closest(TATE_CHU_YOKO_SKIP_SELECTOR)) {
          return NodeFilter.FILTER_REJECT
        }

        if (!node.textContent || !HAS_SHORT_ALPHANUMERIC_TOKEN.test(node.textContent)) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node)
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent
    if (!text) {
      return
    }

    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let match: RegExpExecArray | null

    SHORT_ALPHANUMERIC_TOKEN.lastIndex = 0
    while ((match = SHORT_ALPHANUMERIC_TOKEN.exec(text)) !== null) {
      const prefix = match[1] ?? ''
      const token = match[2]
      const tokenStart = match.index + prefix.length

      if (tokenStart > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, tokenStart)))
      }

      const span = document.createElement('span')
      span.className = 'tate-chu-yoko'
      span.textContent = token
      fragment.appendChild(span)

      lastIndex = tokenStart + token.length
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }

    textNode.parentNode?.replaceChild(fragment, textNode)
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
