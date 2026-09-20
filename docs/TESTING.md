# Testing

The automated tests protect reader behavior and the book-format contract. They do not assert prose, titles, or other editorial content.

Run the full Vitest suite:

```bash
npm test
```

Run only the book parser and format tests:

```bash
npm test -- src/lib/books src/lib/utils/basePath.test.ts
```

Book-format checks validate the documented directory shape, required runtime metadata types, folder-to-metadata identity, and local image references. Parser tests use small fixtures for page splitting and Markdown transformations. Reader tests use jsdom with controlled events and layout metrics; they do not require the development server or a browser process.

No numeric coverage threshold is enforced. New behavior should be covered at its stable public boundary, with assertions focused on observable contracts rather than implementation details.
