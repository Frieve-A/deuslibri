import Fuse from 'fuse.js'
import { BookCatalogItem } from '@/types/book'

export function createBookSearch(books: BookCatalogItem[]) {
  const fuse = new Fuse(books, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'author', weight: 1.5 },
      { name: 'description', weight: 1 },
      { name: 'summary', weight: 1 },
      { name: 'tags', weight: 1.5 },
    ],
    threshold: 0.3,
    includeScore: true,
  })

  return {
    search: (query: string) => {
      if (!query.trim()) return books
      return fuse.search(query).map((result) => result.item)
    },
  }
}

export function filterByTags(books: BookCatalogItem[], tags: string[]) {
  if (tags.length === 0) return books
  return books.filter((book) => tags.some((tag) => book.tags.includes(tag)))
}

export function getAllTags(books: BookCatalogItem[]): string[] {
  const tagSet = new Set<string>()
  books.forEach((book) => {
    book.tags.forEach((tag) => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
}
