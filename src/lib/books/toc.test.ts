import { describe, expect, it } from 'vitest'
import { generateTableOfContents } from './toc'

describe('table of contents generation', () => {
  it('keeps heading level and page index in document order', () => {
    expect(generateTableOfContents([
      '# Chapter One\nBody\n## Section A',
      '### 詳細\n\n# Chapter Two',
    ])).toEqual([
      { id: 'toc-0-chapter-one', text: 'Chapter One', level: 1, pageIndex: 0 },
      { id: 'toc-1-section-a', text: 'Section A', level: 2, pageIndex: 0 },
      { id: 'toc-2-', text: '詳細', level: 3, pageIndex: 1 },
      { id: 'toc-3-chapter-two', text: 'Chapter Two', level: 1, pageIndex: 1 },
    ])
  })

  it('gives repeated and punctuation-only headings stable unique IDs', () => {
    const first = generateTableOfContents(['# Same\n# Same\n# !!!'])
    const second = generateTableOfContents(['# Same\n# Same\n# !!!'])
    expect(first).toEqual(second)
    expect(new Set(first.map((item) => item.id)).size).toBe(first.length)
    expect(first.map((item) => item.text)).toEqual(['Same', 'Same', '!!!'])
  })

  it('ignores non-ATX headings and marker-like heading labels', () => {
    expect(generateTableOfContents(['Title\n=====\n# ---\n## page-break\nNot a heading'])).toEqual([])
  })
})
