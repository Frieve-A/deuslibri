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
export const getFontFamilyCSS = (fontFamily: string, contentLanguage?: string): string => {
  const resolvedFontFamily = contentLanguage === 'en'
    ? {
        mincho: 'serif',
        gothic: 'sans-serif',
      }[fontFamily] ?? fontFamily
    : fontFamily

  switch (resolvedFontFamily) {
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

const SHORT_MATH_MAX_ALPHANUMERIC_COUNT = 2
const TEX_TEXT_COMMAND_PATTERN = /\\(?:text|mathrm|mathit|mathbf|mathsf|mathtt|operatorname)\s*\{([^{}]*)\}/g
const TEX_SPACING_COMMAND_PATTERN = /\\(?:[,;:! ]|quad|qquad|enspace|thinspace|medspace|thickspace)/g
const TEX_COMMAND_PATTERN = /\\[A-Za-z]+|\\./
const SHORT_MATH_ALLOWED_PATTERN = /^[A-Za-z0-9\s{}_^]*$/

const getKatexTexSource = (katex: Element): string => {
  return katex.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? ''
}

const unwrapSimpleTextCommands = (tex: string): string => {
  let previous = tex
  let current = tex.replace(TEX_TEXT_COMMAND_PATTERN, '$1')

  while (current !== previous) {
    previous = current
    current = current.replace(TEX_TEXT_COMMAND_PATTERN, '$1')
  }

  return current
}

const isShortAlphanumericInlineMath = (katex: Element): boolean => {
  if (katex.closest('.katex-display')) {
    return false
  }

  const tex = getKatexTexSource(katex)
  if (!tex) {
    return false
  }

  const visibleStructure = unwrapSimpleTextCommands(tex).replace(TEX_SPACING_COMMAND_PATTERN, '')
  if (TEX_COMMAND_PATTERN.test(visibleStructure)) {
    return false
  }

  if (!SHORT_MATH_ALLOWED_PATTERN.test(visibleStructure)) {
    return false
  }

  const alphanumericCount = visibleStructure.match(/[A-Za-z0-9]/g)?.length ?? 0
  return alphanumericCount > 0 && alphanumericCount <= SHORT_MATH_MAX_ALPHANUMERIC_COUNT
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

    if (isShortAlphanumericInlineMath(katex)) {
      const island = document.createElement('span')
      island.className = 'math-island math-short-island'
      island.style.writingMode = 'horizontal-tb'
      island.style.textOrientation = 'mixed'
      island.style.display = 'inline-block'
      island.style.textIndent = '0'

      katex.parentNode?.insertBefore(island, katex)
      island.appendChild(katex)

      ;(katex as HTMLElement).style.display = 'inline-block'
      ;(katex as HTMLElement).style.textIndent = '0'
      return
    }

    // Create wrapper structure
    const island = document.createElement('span')
    island.className = 'math-island'
    island.style.writingMode = 'horizontal-tb'
    island.style.textOrientation = 'mixed'
    island.style.display = 'inline-block'
    island.style.textIndent = '0'

    const rotatable = document.createElement('span')
    rotatable.className = 'math-rotatable'
    rotatable.style.display = 'inline-block'
    rotatable.style.lineHeight = '0'
    rotatable.style.textIndent = '0'
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
    ;(katex as HTMLElement).style.textIndent = '0'
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

const ALPHANUMERIC_RUN = /[A-Za-z0-9]+/g
const HAS_ALPHANUMERIC = /[A-Za-z0-9]/
const FULL_WIDTH_CONTEXT_CHARACTER = /[\u3000-\u303F\u3040-\u30FF\u3400-\u9FFF\uF900-\uFAFF\uFF01-\uFF60\uFFE0-\uFFE6]/
const TEXT_COMBINE_CONTEXT_ROOT_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption'
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

const toAlphabeticMarker = (value: number, uppercase: boolean): string => {
  if (value < 1) {
    return String(value)
  }

  let remaining = value
  let marker = ''

  while (remaining > 0) {
    remaining -= 1
    marker = String.fromCharCode(97 + (remaining % 26)) + marker
    remaining = Math.floor(remaining / 26)
  }

  return uppercase ? marker.toUpperCase() : marker
}

const toRomanMarker = (value: number, uppercase: boolean): string => {
  if (value < 1 || value > 3999) {
    return String(value)
  }

  const romanPairs: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ]

  let remaining = value
  let marker = ''

  romanPairs.forEach(([number, roman]) => {
    while (remaining >= number) {
      marker += roman
      remaining -= number
    }
  })

  return uppercase ? marker.toUpperCase() : marker
}

const formatOrderedListMarker = (value: number, type: string | null): string => {
  switch (type) {
    case 'a':
      return `${toAlphabeticMarker(value, false)}.`
    case 'A':
      return `${toAlphabeticMarker(value, true)}.`
    case 'i':
      return `${toRomanMarker(value, false)}.`
    case 'I':
      return `${toRomanMarker(value, true)}.`
    default:
      return `${value}.`
  }
}

const getFirstContentNode = (element: Element): ChildNode | null => {
  return Array.from(element.childNodes).find((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      return true
    }

    return Boolean(node.textContent?.trim())
  }) ?? null
}

const isFullWidthContextCharacter = (char: string | null): boolean => {
  return char === null || FULL_WIDTH_CONTEXT_CHARACTER.test(char)
}

const getTextCombineContextRoot = (textNode: Text, container: Element): Element => {
  return textNode.parentElement?.closest(TEXT_COMBINE_CONTEXT_ROOT_SELECTOR) ?? container
}

const getLastTextCharacter = (node: Node): string | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return text.length > 0 ? text[text.length - 1] : null
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  if (element.matches(TATE_CHU_YOKO_SKIP_SELECTOR)) {
    return null
  }

  const childNodes = Array.from(element.childNodes)
  for (let i = childNodes.length - 1; i >= 0; i -= 1) {
    const char = getLastTextCharacter(childNodes[i])
    if (char !== null) {
      return char
    }
  }

  return null
}

const getFirstTextCharacter = (node: Node): string | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return text.length > 0 ? text[0] : null
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  if (element.matches(TATE_CHU_YOKO_SKIP_SELECTOR)) {
    return null
  }

  for (const childNode of Array.from(element.childNodes)) {
    const char = getFirstTextCharacter(childNode)
    if (char !== null) {
      return char
    }
  }

  return null
}

const getPreviousTextCharacter = (textNode: Text, offset: number, root: Element): string | null => {
  const text = textNode.textContent ?? ''
  if (offset > 0) {
    return text[offset - 1] ?? null
  }

  let current: Node | null = textNode
  while (current && current !== root) {
    let sibling = current.previousSibling
    while (sibling) {
      const char = getLastTextCharacter(sibling)
      if (char !== null) {
        return char
      }
      sibling = sibling.previousSibling
    }

    current = current.parentNode
  }

  return null
}

const getNextTextCharacter = (textNode: Text, offset: number, root: Element): string | null => {
  const text = textNode.textContent ?? ''
  if (offset < text.length) {
    return text[offset] ?? null
  }

  let current: Node | null = textNode
  while (current && current !== root) {
    let sibling = current.nextSibling
    while (sibling) {
      const char = getFirstTextCharacter(sibling)
      if (char !== null) {
        return char
      }
      sibling = sibling.nextSibling
    }

    current = current.parentNode
  }

  return null
}

const shouldApplyTateChuYoko = (
  textNode: Text,
  tokenStart: number,
  tokenEnd: number,
  container: Element
): boolean => {
  const root = getTextCombineContextRoot(textNode, container)
  const previousChar = getPreviousTextCharacter(textNode, tokenStart, root)
  const nextChar = getNextTextCharacter(textNode, tokenEnd, root)

  return isFullWidthContextCharacter(previousChar) && isFullWidthContextCharacter(nextChar)
}

/**
 * Replace generated ordered-list markers with explicit tate-chu-yoko spans in vertical mode.
 */
export const applyTateChuYokoToOrderedListMarkers = (html: string): string => {
  if (typeof document === 'undefined') {
    return html // Server-side, return unchanged
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const orderedLists = container.querySelectorAll('ol')

  orderedLists.forEach((olElement) => {
    if (olElement.closest(TATE_CHU_YOKO_SKIP_SELECTOR)) {
      return
    }

    const orderedList = olElement as HTMLOListElement
    const items = Array.from(orderedList.children).filter(
      (child): child is HTMLLIElement => child.tagName.toLowerCase() === 'li'
    )

    if (items.length === 0) {
      return
    }

    orderedList.classList.add('vertical-ordered-list')

    const parsedStart = Number.parseInt(orderedList.getAttribute('start') ?? '', 10)
    let currentValue = Number.isFinite(parsedStart)
      ? parsedStart
      : orderedList.reversed
        ? items.length
        : 1

    items.forEach((item) => {
      const parsedValue = Number.parseInt(item.getAttribute('value') ?? '', 10)
      const markerValue = Number.isFinite(parsedValue) ? parsedValue : currentValue
      currentValue = orderedList.reversed ? markerValue - 1 : markerValue + 1

      item.classList.add('vertical-ordered-list-item')

      if (item.querySelector(':scope > .ordered-list-marker, :scope > p > .ordered-list-marker')) {
        return
      }

      const firstContentNode = getFirstContentNode(item)
      const markerParent = firstContentNode instanceof HTMLParagraphElement
        ? firstContentNode
        : item

      const marker = document.createElement('span')
      marker.className = 'ordered-list-marker tate-chu-yoko'
      marker.setAttribute('aria-hidden', 'true')
      marker.textContent = formatOrderedListMarker(markerValue, orderedList.getAttribute('type'))

      markerParent.insertBefore(document.createTextNode(' '), markerParent.firstChild)
      markerParent.insertBefore(marker, markerParent.firstChild)
    })
  })

  return container.innerHTML
}

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

        if (!node.textContent || !HAS_ALPHANUMERIC.test(node.textContent)) {
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

    ALPHANUMERIC_RUN.lastIndex = 0
    while ((match = ALPHANUMERIC_RUN.exec(text)) !== null) {
      const token = match[0]
      const tokenStart = match.index
      const tokenEnd = tokenStart + token.length

      if (token.length > 2 || !shouldApplyTateChuYoko(textNode, tokenStart, tokenEnd, container)) {
        continue
      }

      if (tokenStart > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, tokenStart)))
      }
      const span = document.createElement('span')
      span.className = 'tate-chu-yoko'
      span.textContent = token
      fragment.appendChild(span)

      lastIndex = tokenEnd
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
