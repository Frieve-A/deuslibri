import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-humanity-en.mjs <draft_v5-directory>');
const base = 'content/books/2026-09/humanity-as-a-transitional-point';
const ja = fs.readFileSync(path.join(base, 'ja/content.md'), 'utf8').replace(/\r\n/g, '\n');
const input = fs.readFileSync(path.join(source, 'content_en.md'), 'utf8').replace(/\r\n/g, '\n');
const metadata = fs.readFileSync(path.join(source, 'metadata_en.yml'), 'utf8');
const destination = path.join(base, 'en');
fs.mkdirSync(path.join(destination, 'images'), { recursive: true });

const jaLines = ja.split('\n');
const breakBeforeHeading = [];
for (let i = 0; i < jaLines.length; i++) {
  if (!/^#{1,3} /.test(jaLines[i])) continue;
  let prior = i - 1;
  while (prior >= 0 && !jaLines[prior].trim()) prior--;
  breakBeforeHeading.push(jaLines[prior] === '---');
}
if (breakBeforeHeading.length !== 116) throw new Error('Japanese heading count changed');

const definitionStart = input.search(/^\[\^0-1\]:/m);
if (definitionStart < 0) throw new Error('English note definitions not found');
const sourceBody = input.slice(0, definitionStart);
const definitions = new Map();
for (const match of input.slice(definitionStart).matchAll(/^\[\^(\d+-\d+)\]:\s*(.*)$/gm)) {
  definitions.set(match[1], match[2].trim());
}

const bodyLines = sourceBody.split('\n');
const frontmatterEnd = bodyLines.findIndex((line, index) => index > 0 && line === '---');
if (frontmatterEnd !== 4) throw new Error('English frontmatter changed');
const result = bodyLines.slice(0, frontmatterEnd + 1);
let headingIndex = 0;
for (const line of bodyLines.slice(frontmatterEnd + 1)) {
  if (line === '---') continue;
  if (/^#{1,3} /.test(line)) {
    if (breakBeforeHeading[headingIndex]) result.push('', '---', '');
    headingIndex++;
  }
  result.push(line);
}
if (headingIndex !== 98) throw new Error(`English heading count is ${headingIndex}, expected 98`);

const noteHeading = [
  'Introduction',
  ...Array.from({ length: 15 }, (_, index) => `Chapter ${index + 1}`),
  'Epilogue',
];
result.push('', '---', '', '# Endnotes');
const extraBreaks = new Set(['1-7', '1-12', '4-6', '11-5', '13-3', '13-7']);
for (let chapter = 0; chapter <= 16; chapter++) {
  if (breakBeforeHeading[99 + chapter]) result.push('', '---', '');
  result.push(`## Notes to ${noteHeading[chapter]}`, '');
  const notes = [...definitions.entries()].filter(([id]) => Number(id.split('-')[0]) === chapter);
  for (const [id, note] of notes) {
    if (extraBreaks.has(id)) result.push('---', '');
    result.push(`**Note ${id}**  ${note}`, '');
  }
}

let output = result.join('\n').replace(/\[\^(\d+-\d+)\]/g, '〔Note $1〕');
output = output.replaceAll('./images/cover-ja.png', './images/cover-en.png');
output = output.replace(/\.\/images\/(fig\d{2})\.png/g, './images/$1.svg');
output = output.replace(/\n{3,}---\n/g, '\n\n---\n');
fs.writeFileSync(path.join(destination, 'content.md'), output.replace(/\n+$/, '\n'), 'utf8');
const pageCount = output.split('\n---\n').filter(page => page.trim()).length - 1;
fs.writeFileSync(
  path.join(destination, 'metadata.yml'),
  metadata.replace('cover-ja.png', 'cover-en.png').replace(/pageCount: \d+/, `pageCount: ${pageCount}`),
  'utf8',
);
console.log({ headingIndex, notes: definitions.size, pageCount });
