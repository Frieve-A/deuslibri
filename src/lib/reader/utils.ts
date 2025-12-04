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
