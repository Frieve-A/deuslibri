# DeusLibri Project Implementation Plan

[日本語版 (Japanese)](./ja/PROJECT_PLAN.md)

## Project Overview

DeusLibri is a static e-book site that is automatically built and deployed with GitHub Actions.
Books written in Markdown are published for free with a sophisticated UI, enabling monetization through Google AdSense.

## 1. Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
  - Deployable to GitHub Pages with SSG (Static Site Generation)
  - Easy SEO optimization
  - Performance optimization with React Server Components
- **Styling**: Tailwind CSS + shadcn/ui
  - Clean and maintainable design system
  - Easy responsive design
- **State Management**: Zustand (lightweight and simple)
- **Search**: Fuse.js (client-side full-text search)
- **Markdown Processing**: unified + remark + rehype
  - Custom plugin implementation for vertical writing support

### Backend & Build
- **Static Site Generator**: Next.js SSG
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages / Vercel / Cloudflare Pages
- **Image Optimization**: next/image + sharp

### Data Management
- **Metadata**: YAML format
- **Content**: Markdown
- **Search Index**: JSON generated at build time

## 2. Directory Structure

```
deuslibri/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions configuration
├── content/                           # E-book content
│   └── books/
│       └── YYYY-MM/                   # Publication year-month
│           └── {book-id}/             # Book ID
│               ├── ja/                # Language-specific
│               │   ├── metadata.yml   # Metadata
│               │   ├── content.md     # Main content
│               │   └── images/        # Images
│               │       ├── cover.jpg
│               │       └── *.jpg
│               ├── en/
│               └── ...
├── docs/                              # Project documentation
│   ├── PROJECT_PLAN.md               # This document (English)
│   ├── WRITING_GUIDE.md              # Writing guide (English)
│   ├── ja/                           # Japanese documentation
│   │   ├── PROJECT_PLAN.md
│   │   └── WRITING_GUIDE.md
│   └── README.md                     # Documentation index
├── public/
│   └── ads.txt                        # Google AdSense configuration
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Catalog top page
│   │   ├── book/
│   │   │   └── [year]/
│   │   │       └── [month]/
│   │   │           └── [id]/
│   │   │               └── [lang]/
│   │   │                   ├── page.tsx    # Book reader
│   │   │                   └── [page]/
│   │   │                       └── page.tsx # Permalink
│   │   ├── settings/
│   │   │   └── page.tsx               # Settings page
│   │   └── api/
│   │       └── search/
│   │           └── route.ts           # Search API
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── catalog/
│   │   │   ├── BookGrid.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TagFilter.tsx
│   │   │   └── BookCard.tsx
│   │   ├── reader/
│   │   │   ├── BookReader.tsx
│   │   │   ├── VerticalReader.tsx
│   │   │   ├── HorizontalReader.tsx
│   │   │   ├── PageControls.tsx
│   │   │   └── TableOfContents.tsx
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx
│   │   └── ads/
│   │       └── AdSenseUnit.tsx
│   ├── lib/
│   │   ├── books/
│   │   │   ├── loader.ts              # Build-time book loading
│   │   │   ├── search-index.ts        # Search index generation
│   │   │   └── metadata.ts            # Metadata type definitions
│   │   ├── storage/
│   │   │   └── local-storage.ts       # LocalStorage operations
│   │   ├── markdown/
│   │   │   └── processor.ts           # Markdown processing
│   │   └── utils.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── reader.css                 # Vertical writing CSS, etc.
│   └── types/
│       └── book.ts
├── scripts/
│   └── generate-search-index.ts       # Build-time script
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 3. Data Format

### metadata.yml (Book Metadata)
```yaml
id: "example-book-001"
title: "Sample Book Title"
author: "Author Name"
publishDate: "2025-12-04"
language: "en"
tags:
  - "Fantasy"
  - "Adventure"
summary: "This book is about..."
description: "A more detailed description..."
recommendText: "Recommended for readers who..."
coverImage: "./images/cover.jpg"
pageCount: 250
estimatedReadingTime: 180  # minutes
isbn: ""  # Optional
series: ""  # Series name (optional)
seriesNumber: 1  # Series number (optional)
```

### content.md (Main Content)
```markdown
# Chapter 1: The Beginning

![Illustration description](./images/illustration-01.jpg)

The main text continues here...

---
page-break
---

# Chapter 2: The Journey

...
```

## 4. Functional Requirements

### 4.1 Catalog Features
- Grid/list view toggle
- Full-text search (title, author, summary, tags)
- Tag filtering (multiple selection)
- Sort functionality (newest, popular, alphabetical)
- Author page: List of books by the same author
- Series feature: Group series books together
- Language filter: Language selection for multilingual support
- Reading status: Unread/reading/completed management
- Rating: Save personal ratings in LocalStorage

### 4.2 Reading Features
- Vertical/horizontal writing toggle (Japanese only)
- Pagination/infinite scroll
- Font size adjustment (small/medium/large/extra-large)
- Permalink (e.g., `/book/2025/12/book-id/en/page/15`)
- Favorite button
- SNS sharing (Twitter, Facebook, LINE, Hatena Bookmark)
- Table of contents navigation: Chapter navigation via sidebar or drawer
- Reading progress bar: Progress display at page top
- Bookmark feature: Save multiple bookmarks
- Font selection: Serif/sans-serif/system fonts
- Line height & margin adjustment: Customize readability
- Dark mode: Eye-friendly night mode
- Text-to-speech: Web Speech API integration
- Keyboard shortcuts: Arrow keys for page navigation, etc.
- Fullscreen mode: Immersive reading experience

### 4.3 Settings Features
- Writing direction (vertical/horizontal)
- Page mode (pagination/scroll)
- Font size
- Theme (light/dark/sepia)
- Font family
- Line height
- Margins
- Animation enable/disable
- Data export/import (migrate reading history)

### 4.4 LocalStorage Data Structure
```typescript
interface UserData {
  favorites: string[];  // Array of book IDs
  recentBooks: {
    bookId: string;
    lastPage: number;
    lastRead: Date;
    progress: number;  // 0-100%
  }[];
  bookmarks: {
    [bookId: string]: {
      page: number;
      note?: string;
      createdAt: Date;
    }[];
  };
  readingStatus: {
    [bookId: string]: 'unread' | 'reading' | 'completed';
  };
  settings: {
    writingMode: 'vertical' | 'horizontal';
    pageMode: 'pagination' | 'scroll';
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    fontFamily: string;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
  };
}
```

### 4.5 Google AdSense Integration
- Catalog page: Naturally placed between grid items
- Reading page: Placed at chapter breaks
- Sidebar ads (for PC display)
- Component-based management
- Responsive ad units

## 5. GitHub Actions CI/CD Pipeline

### .github/workflows/deploy.yml
```yaml
name: Build and Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate search index
        run: npm run generate-search-index

      - name: Build Next.js site
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: ${{ secrets.BASE_PATH || '' }}
          NEXT_PUBLIC_ADSENSE_CLIENT_ID: ${{ secrets.ADSENSE_CLIENT_ID }}

      - name: Export static site
        run: npm run export

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 6. Design System

### Color Palette
```css
/* Light Theme */
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--primary: 221 83% 53%;        /* Trustworthy blue */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96%;
--accent: 210 40% 96%;
--muted: 210 40% 96%;
--border: 214 32% 91%;

/* Dark Theme */
--background: 222 47% 11%;
--foreground: 210 40% 98%;
--primary: 217 91% 60%;
--secondary: 217 33% 17%;

/* Sepia Theme */
--background: 40 20% 95%;
--foreground: 30 20% 20%;
```

### Typography
- **CJK (Chinese, Japanese, Korean)**: Noto Sans CJK, Hiragino Kaku Gothic ProN, system fonts
- **Vertical writing**: Noto Serif CJK, Yu Mincho, system serif fonts
- **Latin**: Inter, -apple-system, BlinkMacSystemFont, sans-serif

### Layout Principles
- **Catalog**: Grid layout (responsive: 1-2-3-4 columns)
- **Reading**: Max width 800px, center-aligned for readability
- **Spacing**: 8px-based multiple system
- **Shadows**: Subtle shadows for hierarchy (Google Material compliance)

## 7. SEO, Performance, and Accessibility

### 7.1 SEO Strategy
- Meta tag optimization (OGP, Twitter Card)
- Automatic sitemap generation
- robots.txt configuration
- Structured data (JSON-LD: Book, BreadcrumbList)
- Appropriate title/description for each page

### 7.2 Performance Targets
- Lighthouse Score 90+
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s

**Optimization Techniques**:
- Image lazy loading
- Optimization with next/image
- Code splitting
- Font preloading
- Service Worker (optional: offline support)

### 7.3 Accessibility
- WCAG 2.1 AA compliance
- Full keyboard navigation support
- Screen reader support
- Sufficient contrast ratio
- Focus indicators
- Proper ARIA label usage

## 8. Multilingual Support

### Language-Specific Display Optimization
- **Japanese**: Both vertical and horizontal writing supported
- **English**: Horizontal writing only
- **Chinese**: Simplified/Traditional Chinese support
- **Other languages**: Basic horizontal writing

### UI Language Switching
- i18n support (Next.js internationalization features)
- URL-based language switching
- Supported UI languages: English (default), Japanese, Chinese (Simplified/Traditional)

### Documentation Multilingual Structure
```
docs/
├── PROJECT_PLAN.md           # English (default)
├── WRITING_GUIDE.md          # English (default)
├── ja/                       # Japanese documentation
│   ├── PROJECT_PLAN.md
│   └── WRITING_GUIDE.md
├── zh/                       # Chinese documentation (future)
│   ├── PROJECT_PLAN.md
│   └── WRITING_GUIDE.md
└── README.md                 # Documentation index with language links
```

## 9. Analytics & Monitoring

- Google Analytics 4 integration ✅ (Tracking ID: G-FW9YWVLT8E)
- Reading time tracking
- Popular page analysis
- Error monitoring (Sentry, etc.)

### Google Analytics Setup (Implemented)
Google Analytics is configured in `src/app/layout.tsx` using Next.js `next/script` component with `strategy="afterInteractive"` for optimal performance.

## 10. Content Management Workflow

### Book Addition Process
1. Place files in `content/books/YYYY-MM/{id}/{lang}/`
2. Create metadata.yml
3. Create content.md
4. Place images
5. Git commit & push
6. Automatic build & deploy via GitHub Actions

### Validation
- YAML schema validation
- Image existence check
- Markdown linting

## 11. Implementation Roadmap

### Phase 1: MVP (Minimum Viable Product)
1. **Project Setup** (1-2 days)
   - Next.js + TypeScript + Tailwind environment
   - Directory structure creation
   - Basic configuration files

2. **Book Data Loader** (2-3 days)
   - YAML parser
   - Markdown processor
   - Build-time data collection

3. **Catalog Page** (3-4 days)
   - Book list display
   - Grid layout
   - Basic search functionality

4. **Reading Page Foundation** (4-5 days)
   - Horizontal writing display
   - Pagination functionality
   - Basic UI

5. **LocalStorage Integration** (2 days)
   - Reading position saving
   - Favorite functionality

6. **GitHub Actions Setup** (1 day)
   - Build & deploy pipeline

### Phase 2: Advanced Features
7. **Vertical Writing Support** (3-4 days)
   - CSS implementation
   - Font optimization
   - Pagination logic

8. **Enhanced Search & Filters** (2-3 days)
   - Fuse.js integration
   - Tag filters
   - Sort functionality

9. **Settings Page** (2 days)
   - Various setting UI
   - Settings persistence

10. **AdSense Integration** (1-2 days)
    - Ad components
    - Placement optimization

### Phase 3: UX Improvements
11. **Design Refinement** (3-5 days)
    - shadcn/ui integration
    - Animations
    - Responsive adjustments

12. **Additional Features** (5-7 days)
    - Table of contents navigation
    - Bookmarks
    - Dark mode
    - SNS sharing

13. **Performance Optimization** (2-3 days)
    - Image optimization
    - Code splitting
    - Caching strategy

14. **SEO & Accessibility** (2-3 days)
    - Meta tag optimization
    - Structured data
    - WCAG compliance

## 12. Future Extensibility (Phase 4+)

- User registration & login (Firebase Auth, etc.)
- Comment system
- Review & rating system
- Paid book support (Stripe payment)
- Author dashboard
- EPUB/PDF export
- Automatic multilingual translation (DeepL API)

## 13. Pre-Implementation Checklist

### Decisions Required
- [ ] Hosting platform (GitHub Pages / Vercel / Cloudflare Pages)
- [ ] Domain name
- [ ] Google AdSense account and client ID
- [ ] Initial content preparation
- [ ] Design details (logo, favicon, etc.)

### Technical Confirmations
- [ ] Node.js 20+ installed
- [ ] GitHub repository created
- [ ] Image optimization tool selection (sharp, etc.)
- [ ] Font license confirmation

---

## Documentation Management

- **This Document**: Overall project plan & technical specifications
- **Writing Guide**: [WRITING_GUIDE.md](./WRITING_GUIDE.md) - Guide for book authors
- **Technical Specification**: TECHNICAL_SPEC.md (detailed implementation specs)
- **Japanese Documentation**: [ja/](./ja/) - 日本語版ドキュメント

---

Last updated: 2025-12-05
