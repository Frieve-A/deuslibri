# DeusLibri Writing Guide

[日本語版 (Japanese)](./ja/WRITING_GUIDE.md)

Welcome to DeusLibri! This guide explains how to write and publish e-books.

## Table of Contents

1. [Introduction](#introduction)
2. [File Structure](#file-structure)
3. [Writing Metadata](#writing-metadata)
4. [Writing Content](#writing-content)
5. [Placing Images](#placing-images)
6. [Publication Workflow](#publication-workflow)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

In DeusLibri, you write books in Markdown format. Simply push to GitHub, and a beautiful e-book site is automatically generated.

### Requirements

- Text editor (VS Code, Atom, Sublime Text, etc.)
- Basic knowledge of Markdown
- Cover image (recommended: 800x1200px or larger JPG/PNG)

---

## File Structure

Books are organized in the following structure:

```
content/books/
└── YYYY-MM/              # Publication year-month (e.g., 2025-12)
    └── {book-id}/        # Unique book ID (e.g., my-first-novel)
        └── {lang}/       # Language code (en, ja, zh, etc.)
            ├── metadata.yml      # Book metadata
            ├── content.md        # Main content
            └── images/           # Images folder
                ├── cover.jpg     # Cover image (required)
                ├── illustration-01.jpg
                └── illustration-02.jpg
```

### Example: Publishing an English novel in December 2025

```
content/books/
└── 2025-12/
    └── mystery-novel-001/
        └── en/
            ├── metadata.yml
            ├── content.md
            └── images/
                ├── cover.jpg
                └── scene-01.jpg
```

---

## Writing Metadata

The `metadata.yml` file contains information about your book.

### Basic Template

```yaml
# Required fields
id: "mystery-novel-001"
title: "Midnight Mystery"
author: "John Smith"
publishDate: "2025-12"
language: "en"
tags:
  - "Mystery"
  - "Suspense"
summary: "A series of murders in a quiet town. Can a young detective uncover the truth?"
description: |
  Midnight Mystery is a contemporary mystery novel set in rural America.
  When a series of murders suddenly occurs in a peaceful small town,
  a rookie detective must unravel complex human relationships
  to reach a shocking truth.
recommendText: "Recommended for fans of classic mysteries and intricate plotting with compelling character drama."
coverImage: "./images/cover.jpg"

# Optional fields
pageCount: 320              # Estimated page count
estimatedReadingTime: 240   # Reading time (minutes)
isbn: ""                    # ISBN if available
series: "Small Town Mysteries"   # Series name
seriesNumber: 1             # Series number
```

### Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | ✓ | Unique book identifier (alphanumeric and hyphens) | `"mystery-novel-001"` |
| `title` | ✓ | Book title | `"Midnight Mystery"` |
| `author` | ✓ | Author name | `"John Smith"` |
| `publishDate` | ✓ | Publication year-month (YYYY-MM format) | `"2025-12"` |
| `language` | ✓ | Language code (en, ja, zh, etc.) | `"en"` |
| `tags` | ✓ | Genre/tags (array format) | `["Mystery", "Suspense"]` |
| `summary` | ✓ | Short summary (1-2 sentences) | `"A series of murders..."` |
| `description` | ✓ | Detailed description (multi-line) | `"Midnight Mystery is..."` |
| `recommendText` | ✓ | Recommendation text | `"Recommended for fans..."` |
| `coverImage` | ✓ | Cover image path | `"./images/cover.jpg"` |
| `pageCount` | - | Page count | `320` |
| `estimatedReadingTime` | - | Reading time (minutes) | `240` |
| `isbn` | - | ISBN number | `"978-1-XXXX-XXXX-X"` |
| `series` | - | Series name | `"Small Town Mysteries"` |
| `seriesNumber` | - | Series number | `1` |

### Choosing Tags

Select 3-5 appropriate tags to help readers find your book.

**Genre Examples**:
- Literature: `Literary Fiction`, `Contemporary`, `Essays`, `Poetry`
- Entertainment: `Mystery`, `Sci-Fi`, `Fantasy`, `Horror`, `Romance`, `Historical`
- Non-fiction: `Business`, `Self-Help`, `Science`, `History`, `Philosophy`, `Technical`
- Target Audience: `Children`, `Young Adult`, `Adult`

---

## Writing Content

Write your main content in `content.md` using Markdown format.

### Basic Markdown Syntax

```markdown
# Chapter 1: The Beginning

## 1. A Quiet Morning

It was a quiet morning. As usual, there were few people at the small station in this rural town.

Use **bold** and *italic* for emphasis.

> Quotes are displayed like this.
> Useful for dialogue.

- List item 1
- List item 2
- List item 3

1. Numbered list
2. Second item
3. Third item
```

### Page Breaks

To explicitly insert page breaks:

```markdown
Content of Chapter 1...

---

# Chapter 2: New Developments

Content of Chapter 2...
```

The horizontal rule (`---`) will be treated as a page break in "page turning" mode.

### Inserting Images

To insert images in your content:

```markdown
![Station view](./images/illustration-01.jpg)
```

**With caption**:

```markdown
![Station view](./images/illustration-01.jpg)
*Figure 1: The station where the incident occurred*
```

### Mathematical Formulas

DeusLibri supports LaTeX-style math formulas using KaTeX.

**Inline math**: Use single dollar signs `$...$`

```markdown
The famous equation $E = mc^2$ shows the relationship between energy and mass.
```

**Display math**: Use double dollar signs `$$...$$`

```markdown
The quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
```

**Note**: In vertical writing mode, math formulas are automatically displayed horizontally for proper rendering.

### Vertical Writing Considerations (Japanese/CJK)

For Japanese books, vertical writing display is supported. Note:

1. **Punctuation**: Use full-width punctuation (、。)
2. **Symbols**: Use full-width ellipsis (…), dash (―), etc.
3. **Brackets**: Use brackets that display correctly in vertical writing
4. **Alphanumerics**: Half-width may appear rotated in vertical mode; full-width recommended

### Recommended Chapter Structure

```markdown
# Chapter 1: Title

## 1. Section 1

Content...

## 2. Section 2

Content...

---
page-break
---

# Chapter 2: Title

## 1. Section 1

Content...
```

Heading levels:
- `# ` (h1): Chapter titles
- `## ` (h2): Sections/scenes
- `### ` (h3): Subsections (as needed)

---

## Placing Images

### Cover Image (Required)

- **Filename**: `cover.jpg` or `cover.png`
- **Recommended Size**: 800x1200px or larger
- **Aspect Ratio**: 2:3 (portrait)
- **Format**: JPEG (smaller file size) or PNG (higher quality)
- **File Size**: Under 500KB recommended

### Illustrations

- **Naming Convention**: `illustration-01.jpg`, `scene-01.jpg`, etc. (descriptive names)
- **Recommended Width**: 1200px or larger (automatically optimized)
- **Format**: JPEG recommended (photos/complex images), PNG (simple graphics/transparency needed)
- **File Size**: Under 500KB each recommended

### Image Optimization Tips

To reduce image size:

1. **Adjust JPEG quality**: 80-90% is sufficient
2. **Resize**: Avoid unnecessarily large images
3. **Use online tools**: TinyPNG, Squoosh, etc.

---

## Publication Workflow

### Step 1: Create Folders

```bash
# Create publication year-month folder
mkdir -p content/books/2025-12

# Create book ID folder
mkdir -p content/books/2025-12/my-novel

# Create language and images folders
mkdir -p content/books/2025-12/my-novel/en/images
```

### Step 2: Create Files

1. Create `metadata.yml` and fill in book information
2. Create `content.md` and write your content
3. Place cover image as `images/cover.jpg`
4. Add illustrations as needed

### Step 3: Local Preview (Optional)

```bash
# Start development server (requires project setup)
npm run dev
```

Access `http://localhost:3000` in your browser to preview.

### Step 4: Push to GitHub

```bash
# Stage changes
git add content/books/2025-12/my-novel

# Commit
git commit -m "Add: New book 'my-novel'"

# Push
git push origin main
```

### Step 5: Automatic Deployment

GitHub Actions automatically:

1. Loads and validates book data
2. Generates search index
3. Builds static site
4. Deploys

After a few minutes, your new book appears on the site.

---

## Best Practices

### Writing Tips

1. **Save & commit regularly**: Use Git for version control frequently
2. **Preview as you write**: Check appearance while writing
3. **Consistent style**: Maintain consistent chapter structure and notation
4. **Prioritize readability**: Keep paragraphs short with appropriate line breaks

### Metadata Tips

1. **Compelling summary**: Write an engaging short summary
2. **Specific tags**: Choose tags that help readers find your book
3. **Accurate reading time**: Calculate as word count ÷ 250 (words per minute)

### Image Tips

1. **Copyright attention**: Only use images you created or have permission to use
2. **Write alt text**: Always include descriptive alternative text
3. **Use alphanumeric filenames**: Avoid non-ASCII characters in filenames

### Multilingual Support

To provide the same book in multiple languages:

```
content/books/2025-12/my-novel/
├── en/              # English version
│   ├── metadata.yml
│   ├── content.md
│   └── images/
│       └── cover.jpg
├── ja/              # Japanese version
│   ├── metadata.yml
│   ├── content.md
│   └── images/
│       └── cover.jpg
└── zh/              # Chinese version
    ├── metadata.yml
    ├── content.md
    └── images/
        └── cover.jpg
```

Translate `metadata.yml` and `content.md` for each language.
Images can be shared or language-specific.

---

## Troubleshooting

### Q: Book doesn't appear on site

**Check**:
- [ ] Folder structure is correct (`content/books/YYYY-MM/{id}/{lang}/`)
- [ ] `metadata.yml` syntax is correct (no YAML errors)
- [ ] All required fields are filled in
- [ ] `coverImage` path is correct
- [ ] GitHub Actions build succeeded (check Actions tab in repository)

### Q: Images don't display

**Check**:
- [ ] Image files exist in `images/` folder
- [ ] Filenames are correct (case-sensitive)
- [ ] Path is correct (`./images/cover.jpg`)
- [ ] Image format is supported (JPG, PNG, GIF, WebP)

### Q: YAML errors

**Common mistakes**:

```yaml
# ❌ Wrong: No space after colon
title:"Midnight Mystery"

# ✅ Correct: Space after colon
title: "Midnight Mystery"

# ❌ Wrong: Inconsistent indentation
tags:
- "Mystery"
  - "Suspense"  # Too much indentation

# ✅ Correct: Aligned indentation
tags:
  - "Mystery"
  - "Suspense"

# ❌ Wrong: Quotes for multi-line string
description: "This is
a multi-line description"

# ✅ Correct: Use pipe symbol
description: |
  This is
  a multi-line description
```

### Q: Vertical writing display issues (Japanese/CJK)

**Check**:
- [ ] Using full-width punctuation
- [ ] Not overusing half-width alphanumerics (full-width recommended for vertical)
- [ ] Special characters display correctly

### Q: Page breaks don't work

**Correct format**:

```markdown
Chapter 1 content

---

Chapter 2 content
```

- Include blank lines before and after the `---`
- Use exactly three hyphens
- The horizontal rule serves as a natural page break

---

## Sample Book

A sample book is available for reference:

- [A Starry Night Tale](../../content/books/2025-12/sample-book/ja/) - Fantasy short story (Japanese)

---

## Help & Support

If you have questions or issues:

1. **GitHub Issues**: [Repository Issues](https://github.com/your-repo/issues)
2. **Documentation**: See [Project Plan](./PROJECT_PLAN.md)
3. **Community**: Discord server (coming soon)

---

## Happy Writing!

Share your stories with readers worldwide through DeusLibri.

---

Last updated: 2025-12-04
