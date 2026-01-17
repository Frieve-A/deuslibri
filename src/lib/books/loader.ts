import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import matter from 'gray-matter'
import { Book, BookMetadata, BookCatalogItem } from '@/types/book'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'books')

/**
 * Get all book folders in the content directory
 */
function getAllBookFolders(): string[] {
  const folders: string[] = []

  if (!fs.existsSync(CONTENT_DIR)) {
    return folders
  }

  // Read year-month folders (e.g., 2025-12)
  const yearMonthFolders = fs.readdirSync(CONTENT_DIR)

  for (const ymFolder of yearMonthFolders) {
    const ymPath = path.join(CONTENT_DIR, ymFolder)
    if (!fs.statSync(ymPath).isDirectory()) continue

    // Read book ID folders
    const bookIdFolders = fs.readdirSync(ymPath)

    for (const bookId of bookIdFolders) {
      const bookIdPath = path.join(ymPath, bookId)
      if (!fs.statSync(bookIdPath).isDirectory()) continue

      // Read language folders
      const langFolders = fs.readdirSync(bookIdPath)

      for (const lang of langFolders) {
        const langPath = path.join(bookIdPath, lang)
        if (!fs.statSync(langPath).isDirectory()) continue

        // Check if metadata.yml exists
        const metadataPath = path.join(langPath, 'metadata.yml')
        if (fs.existsSync(metadataPath)) {
          folders.push(langPath)
        }
      }
    }
  }

  return folders
}

/**
 * Load metadata from metadata.yml
 */
function loadMetadata(folderPath: string): BookMetadata | null {
  const metadataPath = path.join(folderPath, 'metadata.yml')

  if (!fs.existsSync(metadataPath)) {
    return null
  }

  try {
    const fileContents = fs.readFileSync(metadataPath, 'utf8')
    const metadata = yaml.load(fileContents) as any

    return {
      id: metadata.id || '',
      title: metadata.title || '',
      subtitle: metadata.subtitle || undefined,
      author: metadata.author || '',
      description: metadata.description || '',
      summary: metadata.summary || '',
      tags: metadata.tags || [],
      language: metadata.language || 'en',
      publishDate: metadata.publishDate || '',
      coverImage: metadata.coverImage || undefined,
    }
  } catch (error) {
    console.error(`Error loading metadata from ${metadataPath}:`, error)
    return null
  }
}

/**
 * Load content from content.md and split into pages
 */
function loadContent(folderPath: string): { content: string; pages: string[] } {
  const contentPath = path.join(folderPath, 'content.md')

  if (!fs.existsSync(contentPath)) {
    return { content: '', pages: [] }
  }

  try {
    const fileContents = fs.readFileSync(contentPath, 'utf8')
    const { content } = matter(fileContents)

    // Split content by page breaks (---)
    // Use \r?\n to handle both Unix (LF) and Windows (CRLF) line endings
    const pages = content.split(/\r?\n---\r?\n/).filter((page) => page.trim().length > 0)

    return { content, pages }
  } catch (error) {
    console.error(`Error loading content from ${contentPath}:`, error)
    return { content: '', pages: [] }
  }
}

/**
 * Load a single book with full content
 */
export function loadBook(folderPath: string): Book | null {
  const metadata = loadMetadata(folderPath)
  if (!metadata) return null

  const { content, pages } = loadContent(folderPath)

  return {
    ...metadata,
    content,
    pages,
    folderPath,
  }
}

/**
 * Get all books for the catalog (metadata only)
 */
export function getAllBooks(): BookCatalogItem[] {
  const folders = getAllBookFolders()
  const books: BookCatalogItem[] = []

  for (const folderPath of folders) {
    const metadata = loadMetadata(folderPath)
    if (metadata) {
      books.push({
        ...metadata,
        folderPath,
      })
    }
  }

  // Sort by publish date (newest first)
  books.sort((a, b) => {
    const dateA = new Date(a.publishDate).getTime()
    const dateB = new Date(b.publishDate).getTime()
    return dateB - dateA
  })

  return books
}

/**
 * Find a book by ID and language
 */
export function findBookByIdAndLang(id: string, lang: string): Book | null {
  const folders = getAllBookFolders()

  for (const folderPath of folders) {
    const metadata = loadMetadata(folderPath)
    if (metadata && metadata.id === id && metadata.language === lang) {
      return loadBook(folderPath)
    }
  }

  return null
}

/**
 * Get all available languages for a book
 */
export function getBookLanguages(id: string): string[] {
  const folders = getAllBookFolders()
  const languages: string[] = []

  for (const folderPath of folders) {
    const metadata = loadMetadata(folderPath)
    if (metadata && metadata.id === id) {
      languages.push(metadata.language)
    }
  }

  return languages
}
