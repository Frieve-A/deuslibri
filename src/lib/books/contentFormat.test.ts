import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

type Metadata = Record<string, unknown>

const contentRoot = path.join(process.cwd(), 'content', 'books')
const requiredStringFields = ['id', 'title', 'author', 'description', 'summary', 'language', 'publishDate'] as const
const optionalStringFields = ['coverImage', 'subtitle', 'donationLink', 'purchaseLink'] as const

function directories(parent: string): string[] {
  return fs.readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parent, entry.name))
}

function editionFolders(): string[] {
  return directories(contentRoot).flatMap((month) =>
    directories(month).flatMap((book) => directories(book))
  )
}

function localImageReferences(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))/g), (match) => match[1] ?? match[2])
    .filter((reference) => /^(?:\.\/)?images\//.test(reference))
}

function optionalStringErrors(metadata: Metadata, relative: string): string[] {
  return optionalStringFields.flatMap((field) => {
    const value = metadata[field]
    return value !== undefined && value !== null && typeof value !== 'string'
      ? [`${relative}: ${field} must be a string when present`]
      : []
  })
}

describe('repository book format', () => {
  it('keeps edition folders, metadata, content, and local image references structurally consistent', () => {
    const errors: string[] = []
    const editions = editionFolders()

    for (const edition of editions) {
      const relative = path.relative(contentRoot, edition).replace(/\\/g, '/')
      const [month, bookId, language] = relative.split('/')
      const metadataPath = path.join(edition, 'metadata.yml')
      const contentPath = path.join(edition, 'content.md')

      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) errors.push(`${relative}: invalid YYYY-MM folder`)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bookId)) errors.push(`${relative}: invalid book-id folder`)
      if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) errors.push(`${relative}: invalid language folder`)
      if (!fs.existsSync(metadataPath)) {
        errors.push(`${relative}: missing metadata.yml`)
        continue
      }
      if (!fs.existsSync(contentPath)) {
        errors.push(`${relative}: missing content.md`)
        continue
      }

      let metadata: Metadata
      try {
        const parsed = yaml.load(fs.readFileSync(metadataPath, 'utf8'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.push(`${relative}: metadata.yml must contain a mapping`)
          continue
        }
        metadata = parsed as Metadata
      } catch (error) {
        errors.push(`${relative}: invalid metadata.yml (${String(error)})`)
        continue
      }

      for (const field of requiredStringFields) {
        if (typeof metadata[field] !== 'string' || metadata[field].trim() === '') {
          errors.push(`${relative}: ${field} must be a non-empty string`)
        }
      }
      errors.push(...optionalStringErrors(metadata, relative))
      if (metadata.id !== bookId) errors.push(`${relative}: metadata id must match book-id folder`)
      if (metadata.language !== language) errors.push(`${relative}: metadata language must match language folder`)
      if (typeof metadata.publishDate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.publishDate)) {
        errors.push(`${relative}: publishDate must use YYYY-MM-DD`)
      }
      if (!Array.isArray(metadata.tags) || metadata.tags.some((tag) => typeof tag !== 'string')) {
        errors.push(`${relative}: tags must be a string array`)
      }
      if (metadata.unlisted !== undefined && typeof metadata.unlisted !== 'boolean') {
        errors.push(`${relative}: unlisted must be boolean when present`)
      }
      if (metadata.aiUsage !== undefined && metadata.aiUsage !== true && metadata.aiUsage !== 'ai_generated') {
        errors.push(`${relative}: aiUsage has an unsupported value`)
      }

      const references = [
        ...(typeof metadata.coverImage === 'string' && metadata.coverImage.trim() !== '' ? [metadata.coverImage] : []),
        ...localImageReferences(fs.readFileSync(contentPath, 'utf8')),
      ]
      for (const reference of references) {
        const normalized = reference.replace(/^\.\//, '')
        if (!normalized.startsWith('images/')) {
          errors.push(`${relative}: local image must be under images/ (${reference})`)
          continue
        }
        if (!fs.existsSync(path.join(edition, normalized))) {
          errors.push(`${relative}: missing referenced image (${reference})`)
        }
      }
    }

    expect(editions.length).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })

  it.each(optionalStringFields)('rejects a non-string %s without making the field required', (field) => {
    expect(optionalStringErrors({ [field]: { invalid: true } }, 'fixture/ja')).toEqual([
      `fixture/ja: ${field} must be a string when present`,
    ])
    expect(optionalStringErrors({}, 'fixture/ja')).toEqual([])
    expect(optionalStringErrors({ [field]: null }, 'fixture/ja')).toEqual([])
    expect(optionalStringErrors({ [field]: '' }, 'fixture/ja')).toEqual([])
  })
})
