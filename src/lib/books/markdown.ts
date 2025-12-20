import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { withBasePath } from '@/lib/utils/basePath'

/**
 * Convert markdown to HTML and fix image paths
 * Preserves multiple blank lines as visual spacing
 */
export async function markdownToHtml(markdown: string, bookFolderPath?: string): Promise<string> {
  // Pre-process: Manually convert bold and italic to HTML
  // remark parser doesn't recognize word boundaries correctly when **bold** or *italic*
  // is followed by CJK characters (Japanese, Chinese, etc.) without a space
  // By converting to HTML first, we bypass this limitation
  // Note: Bold must be processed before italic to handle ** correctly
  let processedMarkdown = markdown
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')  // Bold **text** -> <strong>text</strong>

  // Italic: match *text* but not inside HTML tags or URLs
  // Use a simpler pattern that avoids matching asterisks in other contexts
  processedMarkdown = processedMarkdown.replace(/(?<![<\w])(\*)([^*\n]+)\1(?![>\w])/g, '<em>$2</em>')

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

  const result = await unified()
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

  return html
}
