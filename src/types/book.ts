export interface BookMetadata {
  id: string
  title: string
  subtitle?: string
  author: string
  description: string
  summary: string
  tags: string[]
  language: string
  publishDate: string
  coverImage?: string
}

export interface TocItem {
  id: string
  text: string
  level: number
  pageIndex: number
}

export interface Book extends BookMetadata {
  content: string
  pages: string[]
  folderPath: string
  tableOfContents?: TocItem[]
}

export interface BookCatalogItem {
  id: string
  title: string
  subtitle?: string
  author: string
  description: string
  summary: string
  tags: string[]
  language: string
  publishDate: string
  coverImage?: string
  folderPath: string
}
