import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { withBasePath } from '@/lib/utils/basePath'

/**
 * Convert LaTeX commands to Unicode characters for plain text display
 */
const latexToUnicode: Record<string, string> = {
  // Greek letters
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\varepsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\varphi': 'φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\omega': 'ω',
  '\\Gamma': 'Γ',
  '\\Delta': 'Δ',
  '\\Theta': 'Θ',
  '\\Lambda': 'Λ',
  '\\Xi': 'Ξ',
  '\\Pi': 'Π',
  '\\Sigma': 'Σ',
  '\\Phi': 'Φ',
  '\\Psi': 'Ψ',
  '\\Omega': 'Ω',
  // Operators and symbols
  '\\cdot': '·',
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\mp': '∓',
  '\\leq': '≤',
  '\\le': '≤',
  '\\geq': '≥',
  '\\ge': '≥',
  '\\neq': '≠',
  '\\ne': '≠',
  '\\approx': '≈',
  '\\sim': '∼',
  '\\simeq': '≃',
  '\\cong': '≅',
  '\\equiv': '≡',
  '\\propto': '∝',
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\sum': '∑',
  '\\prod': '∏',
  '\\int': '∫',
  '\\oint': '∮',
  '\\sqrt': '√',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\supset': '⊃',
  '\\subseteq': '⊆',
  '\\supseteq': '⊇',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\emptyset': '∅',
  '\\varnothing': '∅',
  '\\land': '∧',
  '\\lor': '∨',
  '\\neg': '¬',
  '\\lnot': '¬',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\Leftrightarrow': '⇔',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\uparrow': '↑',
  '\\downarrow': '↓',
  '\\mapsto': '↦',
  '\\ldots': '…',
  '\\cdots': '⋯',
  '\\vdots': '⋮',
  '\\ddots': '⋱',
  '\\prime': '′',
  '\\degree': '°',
  '\\circ': '°',
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\parallel': '∥',
  '\\triangle': '△',
  '\\square': '□',
  '\\diamond': '◇',
  '\\star': '★',
  '\\bullet': '•',
  '\\dagger': '†',
  '\\ddagger': '‡',
  // Spacing (convert to appropriate space or remove)
  '\\,': ' ',
  '\\;': ' ',
  '\\:': ' ',
  '\\!': '',
  '\\quad': '  ',
  '\\qquad': '    ',
  '\\ ': ' ',
  // Common functions (keep as text)
  '\\sin': 'sin',
  '\\cos': 'cos',
  '\\tan': 'tan',
  '\\log': 'log',
  '\\ln': 'ln',
  '\\exp': 'exp',
  '\\lim': 'lim',
  '\\max': 'max',
  '\\min': 'min',
}

/**
 * Convert inline LaTeX math to Unicode plain text
 * Removes $, {}, \text{} and converts LaTeX commands to Unicode
 */
function convertInlineMathToUnicode(latex: string): string {
  let result = latex

  // Handle \text{...} - extract the text content
  result = result.replace(/\\text\{([^}]*)\}/g, '$1')
  result = result.replace(/\\textbf\{([^}]*)\}/g, '$1')
  result = result.replace(/\\textit\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathrm\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathbf\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathit\{([^}]*)\}/g, '$1')

  // Handle superscripts: ^{...} or ^x
  result = result.replace(/\^{([^}]*)}/g, (_, content) => {
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ',
    }
    return content.split('').map((c: string) => superscripts[c] || c).join('')
  })
  result = result.replace(/\^([0-9n])/g, (_, c) => {
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ',
    }
    return superscripts[c] || c
  })

  // Handle subscripts: _{...} or _x
  result = result.replace(/_{([^}]*)}/g, (_, content) => {
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
      'i': 'ᵢ', 'j': 'ⱼ', 'n': 'ₙ', 'm': 'ₘ',
    }
    return content.split('').map((c: string) => subscripts[c] || c).join('')
  })
  result = result.replace(/_([0-9])/g, (_, c) => {
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    }
    return subscripts[c] || c
  })

  // Handle fractions: \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')

  // Convert LaTeX commands to Unicode (sort by length to match longer commands first)
  const sortedCommands = Object.keys(latexToUnicode).sort((a, b) => b.length - a.length)
  for (const cmd of sortedCommands) {
    result = result.split(cmd).join(latexToUnicode[cmd])
  }

  // Remove remaining curly braces
  result = result.replace(/[{}]/g, '')

  // Clean up extra whitespace
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

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
