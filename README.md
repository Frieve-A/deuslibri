# DeusLibri - Open Source E-Book Platform

[日本語版 (Japanese)](./docs/ja/README.md)

DeusLibri is a static e-book site that is automatically built and deployed with GitHub Actions.
Publish books written in Markdown for free with a sophisticated UI.

## Features

- **Easy Writing**: Just write in Markdown format
- **Automatic Deployment**: Auto-build and publish with GitHub Actions
- **Feature-Rich Reader**: Vertical/horizontal writing, pagination/scroll support
- **Reading Experience Memory**: Save favorites and reading positions to LocalStorage
- **Monetization Ready**: Google AdSense integration
- **SEO Optimized**: Search engine-friendly structure
- **Responsive**: Works on smartphones, tablets, and PCs
- **Multilingual Support**: Publish books in multiple languages

## Documentation

- **[Project Plan](./docs/PROJECT_PLAN.md)** - Technical specifications and implementation plan
- **[Writing Guide](./docs/WRITING_GUIDE.md)** - How to write books
- **[Vertical Mode Spec](./docs/VERTICAL_MODE_SPEC.md)** - Japanese vertical writing mode technical specification
- **[日本語ドキュメント](./docs/ja/)** - Japanese documentation

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-username/deuslibri.git
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

Access http://localhost:3000 in your browser

### 4. Write Your Book

See the [Writing Guide](./docs/WRITING_GUIDE.md) for details.

```
content/books/YYYY-MM/{book-id}/{lang}/
├── metadata.yml    # Book metadata
├── content.md      # Main content (Markdown)
└── images/
    └── cover.jpg   # Cover image
```

### 5. Push to GitHub and Publish

```bash
git add .
git commit -m "Add new book"
git push origin main
```

GitHub Actions will automatically build and deploy.

## Project Structure

```
deuslibri/
├── .github/workflows/     # GitHub Actions configuration
├── content/books/         # E-book content
├── docs/                  # Project documentation
│   ├── PROJECT_PLAN.md   # English (default)
│   ├── WRITING_GUIDE.md  # English (default)
│   └── ja/               # Japanese documentation
├── src/                   # Source code
│   ├── app/              # Next.js App Router
│   │   ├── book/         # Book reader pages
│   │   ├── catalog/      # Catalog page
│   │   ├── settings/     # Settings page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   │   ├── books/        # Book data loader
│   │   ├── stores/       # State management
│   │   └── utils/        # Helper functions
│   └── types/            # TypeScript types
└── public/               # Static files
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (with persist middleware)
- **Search**: Fuse.js
- **Markdown Processing**: unified + remark + rehype
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages (static export)

## Implementation Status

- [x] Project plan created
- [x] Writing guide created
- [x] Sample book created
- [x] Multilingual documentation structure
- [x] Next.js project setup
- [x] Book data loader
- [x] Catalog page with search and filters
- [x] Reader page (pagination & scroll modes)
- [x] Settings page
- [x] LocalStorage integration
- [x] GitHub Actions configuration
- [ ] Google AdSense integration
- [ ] UI/UX refinement

See [PROGRESS.md](./PROGRESS.md) for detailed progress.

## Sample Book

A sample book is available for reference:

- [A Starry Night Tale](./content/books/2025-12/sample-book/ja/) - Fantasy short story (Japanese)

## Contributing

DeusLibri is an open source project.
Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

MIT License

## Contact

- GitHub Issues: [Issues](https://github.com/your-username/deuslibri/issues)
- Project Maintainer: DeusLibri Development Team

---

**Share your stories with the world through DeusLibri!**
