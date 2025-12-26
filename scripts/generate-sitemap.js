const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'books');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const ROBOTS_PATH = path.join(PUBLIC_DIR, 'robots.txt');

// Get base URL from environment variable
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// Get all book metadata
function getAllBooks() {
  const books = [];

  if (!fs.existsSync(CONTENT_DIR)) {
    return books;
  }

  // Read year-month folders (e.g., 2025-12)
  const yearMonthFolders = fs.readdirSync(CONTENT_DIR);

  for (const ymFolder of yearMonthFolders) {
    const ymPath = path.join(CONTENT_DIR, ymFolder);
    if (!fs.statSync(ymPath).isDirectory()) continue;

    // Read book ID folders
    const bookIdFolders = fs.readdirSync(ymPath);

    for (const bookId of bookIdFolders) {
      const bookIdPath = path.join(ymPath, bookId);
      if (!fs.statSync(bookIdPath).isDirectory()) continue;

      // Read language folders
      const langFolders = fs.readdirSync(bookIdPath);

      for (const lang of langFolders) {
        const langPath = path.join(bookIdPath, lang);
        if (!fs.statSync(langPath).isDirectory()) continue;

        // Check if metadata.yml exists
        const metadataPath = path.join(langPath, 'metadata.yml');
        if (fs.existsSync(metadataPath)) {
          try {
            const fileContents = fs.readFileSync(metadataPath, 'utf8');
            const metadata = yaml.load(fileContents);
            books.push({
              id: metadata.id,
              language: metadata.language,
              publishDate: metadata.publishDate,
            });
          } catch (error) {
            console.error(`Error loading metadata from ${metadataPath}:`, error);
          }
        }
      }
    }
  }

  return books;
}

// Format date to ISO string (YYYY-MM-DD)
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

// Generate sitemap XML
function generateSitemap() {
  const baseUrl = getBaseUrl();
  const books = getAllBooks();
  const today = formatDate(new Date());

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/catalog', priority: '0.9', changefreq: 'weekly' },
    { url: '/about', priority: '0.5', changefreq: 'monthly' },
    { url: '/settings', priority: '0.3', changefreq: 'monthly' },
  ];

  for (const page of staticPages) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  // Book pages
  for (const book of books) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/book/${book.id}/${book.language}</loc>\n`;
    xml += `    <lastmod>${formatDate(book.publishDate)}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  return xml;
}

// Generate robots.txt
function generateRobots() {
  const baseUrl = getBaseUrl();

  let txt = 'User-agent: *\n';
  txt += 'Allow: /\n';
  txt += '\n';
  txt += `Sitemap: ${baseUrl}/sitemap.xml\n`;

  return txt;
}

// Main
function main() {
  console.log('Generating sitemap and robots.txt...');

  // Ensure public directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Generate sitemap
  const sitemap = generateSitemap();
  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
  console.log(`Sitemap generated at ${SITEMAP_PATH}`);

  // Generate robots.txt
  const robots = generateRobots();
  fs.writeFileSync(ROBOTS_PATH, robots, 'utf8');
  console.log(`robots.txt generated at ${ROBOTS_PATH}`);
}

main();
