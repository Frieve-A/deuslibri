# DeusLibri - Free Digital Library

[Japanese documentation](./docs/ja/README.md)

DeusLibri is a static e-book site for publishing and reading original books written in Markdown.
It is built with Next.js static export and deployed through GitHub Actions.

Live site: [https://deuslibri.com](https://deuslibri.com)

## Features

- **Original book catalog**: Browse currently published books from `content/books`.
- **Search and filters**: Full-text catalog search with tag filtering and language-aware sorting.
- **Reader modes**: Horizontal and Japanese vertical writing, with pagination and infinite scroll modes.
- **Reading memory**: Favorites, reading history, bookmarks, page progress, scroll position, and settings are saved in LocalStorage.
- **Reader controls**: Touch, mouse, keyboard, tap, flick, draggable progress bar, table of contents, and auto-scroll support.
- **Display settings**: Font size, line height, margin, brightness, theme, font family, UI language, and interaction settings.
- **Japanese vertical text support**: Dedicated vertical layout behavior is documented in [Vertical Mode Spec](./docs/VERTICAL_MODE_SPEC.md).
- **Rich Markdown**: Images, captions, tables, GitHub Flavored Markdown, and LaTeX math through KaTeX.
- **Multilingual UI and books**: English and Japanese UI, with per-book language folders.
- **PWA and SEO**: Web app manifest, icons, Open Graph/Twitter metadata, sitemap, and robots.txt generation.
- **Analytics and ads wiring**: Google Analytics and AdSense scripts are configured for the current deployed site.

## Current Books

Current content lives under `content/books/`:

- [Axioms of Story Creation / 物語創造の公理](./content/books/2026-06/story-creation-axioms/)
- [Physical AI: Ground Truth / フィジカルAI : Ground Truth](./content/books/2026-01/physical-ai/)
- [2025—AI Begins Self-Improvement / 2025―自己増殖を始めたAI](./content/books/2025-12/ai-begins-self-improvement/)
- [The End and Rebirth of Audio / オーディオの終焉と再生](./content/books/2025-12/the-end-and-rebirth-of-audio/)
- [God's Bootloader / 神のブートローダー](./content/books/2025-12/gods-bootloader/)

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd deuslibri
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Access [http://localhost:3000](http://localhost:3000).

### 4. Build Static Site

```bash
npm run build
```

The static export is generated in `out/`.

## Writing Books

See the [Writing Guide](./docs/WRITING_GUIDE.md) for the full author workflow.

Each language edition is stored as:

```text
content/books/YYYY-MM/{book-id}/{lang}/
├── metadata.yml
├── content.md
└── images/
    └── cover.jpg
```

Common language folders are `en` and `ja`. A book can be hidden from public catalog and sitemap output by setting `unlisted: true` in `metadata.yml`; the direct book URL is still generated.

## Configuration

### Site URL and Base Path

Set `NEXT_PUBLIC_BASE_URL` to the deployed site URL. This value is used for:

- Next.js `metadataBase`
- generated `sitemap.xml`
- generated `robots.txt`
- automatic `basePath` extraction for GitHub Pages subpath deployments

The current GitHub Actions deployment uses:

```yaml
NEXT_PUBLIC_BASE_URL: https://deuslibri.com
```

For a fork or different host, update `.github/workflows/deploy.yml`.

### Analytics and Ads

`src/app/layout.tsx` currently contains the Google Analytics ID and AdSense publisher ID for the deployed site.
Update those IDs when deploying a separate site.

`src/components/AdSense.tsx` provides the ad component. Reader ad placements in `src/components/reader/ReaderContent.tsx` are currently commented out until production slots are finalized.

## Documentation

- [Documentation Index](./docs/README.md)
- [Project Plan](./docs/PROJECT_PLAN.md)
- [Writing Guide](./docs/WRITING_GUIDE.md)
- [Vertical Mode Spec](./docs/VERTICAL_MODE_SPEC.md)
- [Japanese Documentation](./docs/ja/README.md)

## Project Structure

```text
deuslibri/
├── .github/workflows/      # GitHub Actions deployment
├── content/books/          # Book source content
├── docs/                   # English and Japanese documentation
├── public/                 # Static assets, generated sitemap, copied content
├── scripts/                # Content copy, sitemap, favicon, and authoring helpers
└── src/
    ├── app/                # Next.js App Router pages
    │   ├── about/
    │   ├── book/[id]/[lang]/
    │   ├── catalog/
    │   └── settings/
    ├── components/         # React components and reader UI
    ├── hooks/              # Reader interaction hooks
    ├── lib/                # Books, reader utilities, stores, i18n, helpers
    └── types/              # TypeScript types
```

## Technology Stack

- **Framework**: Next.js 16 with App Router and static export
- **Runtime UI**: React 19
- **Styling**: Tailwind CSS v4 and `@tailwindcss/typography`
- **State Management**: Zustand with persist middleware
- **Search**: Fuse.js
- **Markdown**: unified, remark, rehype, GFM, math, and KaTeX
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages compatible static output

## Implementation Status

Implemented:

- Static content loading from `content/books`
- Multilingual book structure and English/Japanese UI
- Catalog, search, filters, favorites, and reading history
- Modular reader with pagination, infinite scroll, vertical writing, bookmarks, table of contents, progress persistence, and auto-scroll
- Settings page with display, interaction, language, PWA install, and data import/export controls
- Markdown images, captions, tables, KaTeX math, and typography styling
- Donation and print-book links in book metadata
- PWA metadata, favicon/icons, sitemap, robots.txt, SEO metadata, Google Analytics, and AdSense script setup
- GitHub Actions deployment to GitHub Pages

Current improvement areas:

- Performance and image optimization
- Accessibility refinements
- Final production ad slot placement
- Ongoing UI/UX polishing

See [PROGRESS.md](./PROGRESS.md) for historical implementation notes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a pull request

When adding or changing books, keep `metadata.yml`, `content.md`, image paths, and language folders consistent with the Writing Guide.

## License

MIT License. See [LICENSE](./LICENSE).

---

Last updated: 2026-06-12
