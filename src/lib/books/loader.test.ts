import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findBookByIdAndLang, getAllBooks, getBookLanguages, loadBook } from './loader'

const temporaryFolders: string[] = []

function createBookFixture(metadata: string, content?: string): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'deuslibri-book-'))
  temporaryFolders.push(folder)
  fs.writeFileSync(path.join(folder, 'metadata.yml'), metadata, 'utf8')
  if (content !== undefined) {
    fs.writeFileSync(path.join(folder, 'content.md'), content, 'utf8')
  }
  return folder
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const folder of temporaryFolders.splice(0)) {
    fs.rmSync(folder, { recursive: true, force: true })
  }
})

describe('book loading contract', () => {
  it('maps supported metadata and splits LF or CRLF page delimiters after frontmatter', () => {
    const folder = createBookFixture(
      [
        'id: fixture-book',
        'title: Fixture',
        'subtitle: A subtitle',
        'author: Author',
        'description: Description',
        'summary: Summary',
        'tags: [essay, test]',
        'language: ja',
        'publishDate: "2026-09-01"',
        'coverImage: ./images/cover.jpg',
        'donationLink: https://example.test/donate',
        'purchaseLink: https://example.test/buy',
        'unlisted: true',
        'aiUsage: ai_generated',
      ].join('\n'),
      '---\r\ndraft: false\r\n---\r\n# First\r\n\r\nBody\r\n---\r\n\r\n# Second\r\n---\r\n\r\n'
    )

    const book = loadBook(folder)

    expect(book).toMatchObject({
      id: 'fixture-book',
      title: 'Fixture',
      subtitle: 'A subtitle',
      author: 'Author',
      tags: ['essay', 'test'],
      language: 'ja',
      publishDate: '2026-09-01',
      unlisted: true,
      aiUsage: 'ai_generated',
      folderPath: folder,
    })
    expect(book?.content).not.toContain('draft: false')
    expect(book?.pages.map((page) => page.trim())).toEqual(['# First\r\n\r\nBody', '# Second'])
  })

  it('returns an empty body for a metadata-only edition and rejects missing or invalid metadata', () => {
    const metadataOnly = createBookFixture('id: metadata-only\ntitle: Metadata only\nlanguage: en')
    expect(loadBook(metadataOnly)).toMatchObject({ content: '', pages: [] })

    const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'deuslibri-book-'))
    temporaryFolders.push(missing)
    expect(loadBook(missing)).toBeNull()

    const invalid = createBookFixture('title: [unterminated')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(loadBook(invalid)).toBeNull()
    expect(error).toHaveBeenCalledOnce()
  })

  it('accepts only the documented AI disclosure values', () => {
    const legacyTrue = createBookFixture('id: legacy\ntitle: Legacy\nlanguage: en\naiUsage: true')
    const unknown = createBookFixture('id: unknown\ntitle: Unknown\nlanguage: en\naiUsage: assisted')
    expect(loadBook(legacyTrue)?.aiUsage).toBe(true)
    expect(loadBook(unknown)?.aiUsage).toBeUndefined()
  })
})

describe('catalog lookup contract', () => {
  it('keeps unlisted editions out of the public catalog and sorts valid dates newest first', () => {
    const all = getAllBooks({ includeUnlisted: true })
    const listed = getAllBooks()

    expect(all.length).toBeGreaterThan(0)
    expect(listed.every((book) => book.unlisted !== true)).toBe(true)
    expect(listed.map((book) => book.folderPath)).toEqual(
      all.filter((book) => !book.unlisted).map((book) => book.folderPath)
    )
    for (let index = 1; index < all.length; index += 1) {
      expect(new Date(all[index - 1].publishDate).getTime())
        .toBeGreaterThanOrEqual(new Date(all[index].publishDate).getTime())
    }
  })

  it('finds an existing edition and reports its available languages without hard-coded titles', () => {
    const sample = getAllBooks({ includeUnlisted: true })[0]
    expect(sample).toBeDefined()
    expect(findBookByIdAndLang(sample.id, sample.language)).toMatchObject({
      id: sample.id,
      language: sample.language,
    })
    expect(getBookLanguages(sample.id)).toContain(sample.language)
    expect(findBookByIdAndLang('__missing__', '__missing__')).toBeNull()
  })
})
