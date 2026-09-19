import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { withBasePath } from '@/lib/utils/basePath'

import { convertInlineMathToUnicode } from './math'

/**
 * Pre-process markdown to convert inline math to Unicode when math is disabled
 * Block math ($$...$$) is left as-is
 */
function convertInlineMathInMarkdown(markdown: string): string {
  // First, protect block math by replacing with placeholders
  const blockMathPlaceholders: string[] = []
  let processed = markdown.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    blockMathPlaceholders.push(match)
    return `<<<BLOCK_MATH_${blockMathPlaceholders.length - 1}>>>`
  })

  // Convert inline math $...$ to Unicode
  // Match $ followed by non-$ content, followed by $
  // But not $$ (which would be empty block math)
  processed = processed.replace(/\$([^$]+)\$/g, (_, content) => {
    return convertInlineMathToUnicode(content)
  })

  // Restore block math placeholders
  processed = processed.replace(/<<<BLOCK_MATH_(\d+)>>>/g, (_, index) => {
    return blockMathPlaceholders[parseInt(index)]
  })

  return processed
}

interface MarkdownImageLine {
  alt: string
  src: string
  title?: string
}

const MARKDOWN_IMAGE_LINE = /^\s{0,3}!\[([^\]\n]*)\]\(\s*(<[^>\n]*>|[^\s)]+)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*\)\s*$/
const CAPTION_LINE = /^\s*Caption: (.*)$/

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

function parseMarkdownImageLine(line: string): MarkdownImageLine | null {
  const match = line.match(MARKDOWN_IMAGE_LINE)
  if (!match) {
    return null
  }

  const rawSrc = match[2]
  const src = rawSrc.startsWith('<') && rawSrc.endsWith('>')
    ? rawSrc.slice(1, -1)
    : rawSrc

  return {
    alt: match[1],
    src,
    title: match[3] ?? match[4] ?? match[5] ?? undefined,
  }
}

function buildFigureHtml(image: MarkdownImageLine, caption: string): string {
  const title = image.title
    ? ` title="${escapeHtml(image.title)}"`
    : ''

  return `<figure><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"${title}><figcaption>${escapeHtml(caption)}</figcaption></figure>`
}

function convertCaptionedImagesToFigures(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const converted: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const image = parseMarkdownImageLine(lines[index])
    if (!image) {
      converted.push(lines[index])
      continue
    }

    let nextContentIndex = index + 1
    while (nextContentIndex < lines.length && lines[nextContentIndex].trim() === '') {
      nextContentIndex += 1
    }

    const captionMatch = lines[nextContentIndex]?.match(CAPTION_LINE)
    if (!captionMatch) {
      converted.push(lines[index])
      continue
    }

    converted.push(buildFigureHtml(image, captionMatch[1]))
    index = nextContentIndex
  }

  return converted.join('\n')
}

const MARKDOWN_TABLE_NOWRAP_CLASS = 'markdown-table-nowrap'

type MarkdownTableWrapHints = boolean[]

function splitMarkdownTableRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) {
    row = row.slice(1)
  }
  if (row.endsWith('|')) {
    row = row.slice(0, -1)
  }

  const cells: string[] = []
  let cell = ''
  let escaped = false
  let inCode = false

  for (const character of row) {
    if (escaped) {
      cell += character
      escaped = false
      continue
    }

    if (character === '\\') {
      cell += character
      escaped = true
      continue
    }

    if (character === '`') {
      inCode = !inCode
      cell += character
      continue
    }

    if (character === '|' && !inCode) {
      cells.push(cell.trim())
      cell = ''
      continue
    }

    cell += character
  }

  cells.push(cell.trim())
  return cells
}

function isMarkdownTableDelimiterLine(line: string): boolean {
  const cells = splitMarkdownTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))
}

function getMarkdownDelimiterWidth(cell: string): number {
  return Array.from(cell).filter((character) => character === '-').length
}

function stripMarkdownCellSyntax(cell: string): string {
  return cell
    .replace(/\\\|/g, '|')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]\n]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
}

function getCharacterDisplayWidth(character: string): number {
  const codePoint = character.codePointAt(0) ?? 0

  if (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  ) {
    return 2
  }

  return 1
}

function getMarkdownCellDisplayWidth(cell: string): number {
  return Array.from(stripMarkdownCellSyntax(cell)).reduce(
    (width, character) => width + getCharacterDisplayWidth(character),
    0
  )
}

function getMarkdownTableWrapHints(markdown: string): MarkdownTableWrapHints[] {
  const lines = markdown.split(/\r?\n/)
  const tableHints: MarkdownTableWrapHints[] = []

  for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex += 1) {
    if (!lines[lineIndex].includes('|') || !isMarkdownTableDelimiterLine(lines[lineIndex + 1])) {
      continue
    }

    const headerCells = splitMarkdownTableRow(lines[lineIndex])
    const delimiterCells = splitMarkdownTableRow(lines[lineIndex + 1])
    const columnCount = Math.max(headerCells.length, delimiterCells.length)
    const contentRows = [headerCells]
    let tableEndIndex = lineIndex + 2

    while (tableEndIndex < lines.length && lines[tableEndIndex].trim() !== '' && lines[tableEndIndex].includes('|')) {
      if (isMarkdownTableDelimiterLine(lines[tableEndIndex])) {
        break
      }
      contentRows.push(splitMarkdownTableRow(lines[tableEndIndex]))
      tableEndIndex += 1
    }

    tableHints.push(
      Array.from({ length: columnCount }, (_value, columnIndex) => {
        const delimiterWidth = getMarkdownDelimiterWidth(delimiterCells[columnIndex] ?? '')
        if (delimiterWidth === 0) {
          return false
        }

        return contentRows.every((row) => delimiterWidth > getMarkdownCellDisplayWidth(row[columnIndex] ?? ''))
      })
    )

    lineIndex = tableEndIndex - 1
  }

  return tableHints
}

function addClassToHtmlOpeningTag(openingTag: string, className: string): string {
  const classAttribute = openingTag.match(/\sclass=(["'])(.*?)\1/)
  if (!classAttribute) {
    return openingTag.replace(/>$/, ` class="${className}">`)
  }

  const existingClasses = classAttribute[2].split(/\s+/)
  if (existingClasses.includes(className)) {
    return openingTag
  }

  return openingTag.replace(classAttribute[0], ` class=${classAttribute[1]}${classAttribute[2]} ${className}${classAttribute[1]}`)
}

function applyMarkdownTableWrapHints(html: string, tableHints: MarkdownTableWrapHints[]): string {
  let tableIndex = 0

  return html.replace(/<table\b[\s\S]*?<\/table>/g, (tableHtml) => {
    if (!/<thead\b/.test(tableHtml)) {
      return tableHtml
    }

    const columnHints = tableHints[tableIndex]
    tableIndex += 1

    if (!columnHints?.some(Boolean)) {
      return tableHtml
    }

    return tableHtml.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/g, (rowHtml) => {
      let columnIndex = 0
      return rowHtml.replace(/<(th|td)\b[^>]*>/g, (openingTag) => {
        const shouldPreventWrap = columnHints[columnIndex] === true
        columnIndex += 1
        return shouldPreventWrap
          ? addClassToHtmlOpeningTag(openingTag, MARKDOWN_TABLE_NOWRAP_CLASS)
          : openingTag
      })
    })
  })
}

interface MarkdownToHtmlOptions {
  bookFolderPath?: string
  /** Disable math rendering (LaTeX will be shown as plain text) */
  disableMath?: boolean
  /** Disable image rendering (images will be removed from output) */
  disableImages?: boolean
}

/**
 * Convert markdown to HTML and fix image paths
 * Preserves multiple blank lines as visual spacing
 */
export async function markdownToHtml(markdown: string, options?: string | MarkdownToHtmlOptions): Promise<string> {
  // Support legacy signature: markdownToHtml(markdown, bookFolderPath)
  const { bookFolderPath, disableMath, disableImages } = typeof options === 'string'
    ? { bookFolderPath: options, disableMath: false, disableImages: false }
    : { bookFolderPath: options?.bookFolderPath, disableMath: options?.disableMath ?? false, disableImages: options?.disableImages ?? false }
  // Pre-process: Convert inline math to Unicode when math is disabled
  // Block math ($$...$$) is preserved as-is, inline math ($...$) is converted
  let processedMarkdown = disableMath
    ? convertInlineMathInMarkdown(markdown)
    : markdown

  // Pre-process: Manually convert bold and italic to HTML
  // remark parser doesn't recognize word boundaries correctly when **bold** or *italic*
  // is followed by CJK characters (Japanese, Chinese, etc.) without a space
  // By converting to HTML first, we bypass this limitation
  // Note: Bold must be processed before italic to handle ** correctly
  processedMarkdown = processedMarkdown
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')  // Bold **text** -> <strong>text</strong>

  // Italic: match *text* but not inside HTML tags or URLs
  // Use a simpler pattern that avoids matching asterisks in other contexts
  processedMarkdown = processedMarkdown.replace(/(?<![<\w])(\*)([^*\n]+)\1(?![>\w])/g, '<em>$2</em>')

  // Pre-process: Convert a standalone markdown image followed by the next
  // non-empty "Caption: " line into a semantic figure/figcaption pair.
  processedMarkdown = convertCaptionedImagesToFigures(processedMarkdown)
  const tableWrapHints = getMarkdownTableWrapHints(processedMarkdown)

  // Pre-process: Convert multiple consecutive blank lines to spacer markers
  // Standard markdown ignores extra blank lines, but we want to preserve them
  // Match 2+ consecutive blank lines and replace with marker paragraphs
  // Use a text marker that will be wrapped in <p> tags by the markdown parser
  const SPACER_MARKER = ':::SPACER:::'
  processedMarkdown = processedMarkdown.replace(/\n(\n{2,})/g, (_match, blanks) => {
    // Count extra blank lines (subtract 1 for the normal paragraph break)
    const extraLines = blanks.length - 1
    // Insert marker paragraphs for each extra blank line
    return '\n\n' + (SPACER_MARKER + '\n\n').repeat(extraLines)
  })

  // Build the processor pipeline based on whether math is enabled
  const result = disableMath
    ? await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(processedMarkdown)
    : await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(processedMarkdown)

  let html = result.toString()

  // Post-process: Convert spacer markers to empty spacer divs
  html = html.replace(
    /<p>:::SPACER:::<\/p>/g,
    '<div class="spacer" aria-hidden="true"></div>'
  )

  html = applyMarkdownTableWrapHints(html, tableWrapHints)

  // Fix relative image paths if bookFolderPath is provided
  if (bookFolderPath) {
    // Extract the relative path from content/books/
    const relativePath = bookFolderPath.replace(/\\/g, '/').split('content/books/')[1]
    if (relativePath) {
      // Replace relative image paths with absolute paths
      // Match both "./images/" and "images/"
      const basePath = withBasePath(`/content/books/${relativePath}/images/`)
      html = html.replace(
        /src="(?:\.\/)?images\/([^"]+)"/g,
        `src="${basePath}$1"`
      )
    }
  }

  // Add target="_blank" rel="noopener noreferrer" to all links
  // This makes external links open in a new tab for better reading experience
  html = html.replace(
    /<a href="([^"]+)"(?![^>]*target=)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"'
  )

  // Remove images if disableImages is enabled
  if (disableImages) {
    html = html.replace(/<img[^>]*>/g, '')
  }

  return html
}
