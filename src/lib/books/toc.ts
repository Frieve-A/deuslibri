import { TocItem } from '@/types/book'

/**
 * Generate table of contents from markdown pages
 */
export function generateTableOfContents(pages: string[]): TocItem[] {
  const toc: TocItem[] = []
  let tocIdCounter = 0

  pages.forEach((page, pageIndex) => {
    // Extract headings from markdown
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    let match

    while ((match = headingRegex.exec(page)) !== null) {
      const level = match[1].length // Number of # characters
      const text = match[2].trim()

      // Skip if it's a page break marker
      if (text === '---' || text === 'page-break') {
        continue
      }

      // Generate unique ID for the heading
      const id = `toc-${tocIdCounter++}-${text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50)}`

      toc.push({
        id,
        text,
        level,
        pageIndex,
      })
    }
  })

  return toc
}
