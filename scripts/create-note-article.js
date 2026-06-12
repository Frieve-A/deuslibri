#!/usr/bin/env node

/**
 * Create a note.com article draft from markdown.
 *
 * Converts:
 * - Block math: $$formula$$ -> $${formula}$$
 * - Inline math: $formula$ -> $${formula}$$
 * - Markdown tables -> KaTeX array format (optional, disabled by default)
 * - Markdown tables -> PNG images (optional, disabled by default)
 * - Markdown tables -> Plain text list format (optional, disabled by default)
 * - Block math ($$...$$) -> PNG images (optional, disabled by default)
 *
 * Usage:
 * node create-note-article.js <input-file> [--convert-tables] [--export-tables-as-images] [--export-math-as-images] [--convert-tables-to-list] [--table-image-max-chars 34]
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const katex = require('katex');

const DEFAULT_TABLE_IMAGE_MAX_CHARS = 34;
const MIN_TABLE_IMAGE_COLUMN_CHARS = 2;
const NATURAL_TABLE_IMAGE_COLUMN_CHARS = 20;

function convertTableToKaTeX(tableLines) {
  // Remove empty lines
  const lines = tableLines.filter(line => line.trim());

  if (lines.length < 2) return tableLines.join('\n');

  // Parse table rows
  const rows = lines.map(line => {
    // Remove leading/trailing pipes and split by pipe
    return line.trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  });

  // Skip alignment row (second row with :---, :---:, ---:, etc.)
  const hasAlignmentRow = rows[1] && rows[1].every(cell => /^:?-+:?$/.test(cell));
  const dataRows = hasAlignmentRow ? [rows[0], ...rows.slice(2)] : rows;

  const numCols = dataRows[0].length;
  // Use |c|c|c| format with vertical lines
  const alignment = '|' + 'c|'.repeat(numCols);

  // Convert cells: Remove markdown bold/italic syntax and escape special characters
  const convertCell = (cell) => {
    return cell
      .replace(/\*\*(.*?)\*\*/g, '\\mathbf{$1}')  // Bold (using mathbf for better compatibility)
      .replace(/\*(.*?)\*/g, '\\textit{$1}')      // Italic
      .replace(/`(.*?)`/g, '\\texttt{$1}')        // Code
      .replace(/\$([^\$]+?)\$/g, '$1')            // Remove $ wrappers from inline math (array is already in math mode)
      .replace(/&/g, '\\&')
      .replace(/\\,/g, '');                       // Remove \, (thin space) - not supported by note.com
  };

  // Build all rows with \hline before each row and after the last row
  const allRows = dataRows.map(row => {
    return '\\hline\n' + row.map(convertCell).join(' & ') + ' \\\\';
  }).join('\n') + '\n\\hline';

  return 'DOLLARDOLLAR\n\\small\n\\begin{array}{' + alignment + '}\n' + allRows + '\n\\end{array}\nDOLLARDOLLAR';
}

function parseMarkdownTable(tableLines) {
  // Remove empty lines
  const lines = tableLines.filter(line => line.trim());

  if (lines.length < 2) return null;

  // Parse table rows
  const rows = lines.map(line => {
    return line.trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  });

  // Skip alignment row
  const hasAlignmentRow = rows[1] && rows[1].every(cell => /^:?-+:?$/.test(cell));
  const dataRows = hasAlignmentRow ? [rows[0], ...rows.slice(2)] : rows;

  return dataRows;
}

function convertTableToList(tableLines) {
  const rows = parseMarkdownTable(tableLines);
  if (!rows || rows.length < 2) return tableLines.join('\n');

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Convert each data row to a list of "- Header: Value" entries
  const listItems = dataRows.map(row => {
    return headers.map((header, idx) => {
      const value = row[idx] || '';
      return `- ${header}: ${value}`;
    }).join('\n');
  });

  // Join rows with blank lines
  return listItems.join('\n\n');
}

function countChars(text) {
  return Array.from(text).reduce((width, char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return width;

    if (codePoint <= 0x007e || (codePoint >= 0xff61 && codePoint <= 0xff9f)) {
      return width + 0.5;
    }

    return width + 1;
  }, 0);
}

function stripMarkdownForWidth(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\$([^\$]+?)\$/g, '$1');
}

function getCellWidth(cell) {
  return countChars(stripMarkdownForWidth(cell).trim());
}

function getPreferredCellWidth(cell) {
  const normalized = stripMarkdownForWidth(cell).replace(/\s+/g, ' ').trim();
  if (!normalized) return MIN_TABLE_IMAGE_COLUMN_CHARS;

  return Math.max(
    ...normalized.split(' ').map(word => countChars(word)),
    MIN_TABLE_IMAGE_COLUMN_CHARS
  );
}

function getColumnWidths(rows, maxTableChars = DEFAULT_TABLE_IMAGE_MAX_CHARS) {
  const columnCount = Math.max(...rows.map(row => row.length));
  const borderChars = columnCount + 1;
  const availableChars = Math.max(columnCount, maxTableChars - borderChars);
  const maxContentWidths = Array.from({ length: columnCount }, (_, colIndex) => {
    return Math.max(
      ...rows.map(row => getCellWidth(row[colIndex] || '')),
      MIN_TABLE_IMAGE_COLUMN_CHARS
    );
  });
  const preferredWidths = Array.from({ length: columnCount }, (_, colIndex) => {
    return Math.min(
      Math.max(...rows.map(row => getPreferredCellWidth(row[colIndex] || ''))),
      NATURAL_TABLE_IMAGE_COLUMN_CHARS
    );
  });

  const naturalWidth = maxContentWidths.reduce((sum, width) => sum + width, 0);
  if (naturalWidth <= availableChars) {
    return maxContentWidths;
  }

  const widths = preferredWidths.map(width => Math.max(width, MIN_TABLE_IMAGE_COLUMN_CHARS));
  let widthTotal = widths.reduce((sum, width) => sum + width, 0);

  while (widthTotal > availableChars) {
    let widestColumn = -1;
    let widestWidth = MIN_TABLE_IMAGE_COLUMN_CHARS;

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      if (widths[colIndex] > widestWidth) {
        widestColumn = colIndex;
        widestWidth = widths[colIndex];
      }
    }

    if (widestColumn === -1) {
      break;
    }

    widths[widestColumn]--;
    widthTotal--;
  }

  let remaining = Math.max(0, availableChars - widthTotal);

  while (remaining > 0) {
    let bestColumn = -1;
    let bestDeficit = 0;

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const deficit = maxContentWidths[colIndex] - widths[colIndex];
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        bestColumn = colIndex;
      }
    }

    if (bestColumn === -1) {
      break;
    }

    widths[bestColumn]++;
    remaining--;
  }

  return widths;
}

function wrapCellText(cell, maxChars) {
  const normalized = cell.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];

  const words = normalized.split(' ');
  if (words.length > 1) {
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const wordParts = [];
      let currentPart = '';

      for (const char of Array.from(word)) {
        if (getCellWidth(currentPart) >= maxChars) {
          wordParts.push(currentPart);
          currentPart = '';
        }

        currentPart += char;
      }

      if (currentPart) {
        wordParts.push(currentPart);
      }

      for (const wordPart of wordParts) {
        const nextLine = currentLine ? `${currentLine} ${wordPart}` : wordPart;

        if (currentLine && getCellWidth(nextLine) > maxChars) {
          lines.push(currentLine);
          currentLine = wordPart;
        } else {
          currentLine = nextLine;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  const lines = [];
  let currentLine = '';

  for (const char of Array.from(normalized)) {
    if (countChars(currentLine) >= maxChars) {
      lines.push(currentLine.trimEnd());
      currentLine = '';
    }

    currentLine += char;
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines;
}

async function exportMathAsImage(formula, outputPath, mathIndex, browser) {
  // Get KaTeX CSS
  const katexCss = fs.readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf-8');

  // Render the formula
  let renderedFormula;
  try {
    renderedFormula = katex.renderToString(formula.trim(), {
      throwOnError: false,
      displayMode: true
    });
  } catch (e) {
    console.error(`  - Math ${mathIndex + 1} failed to render: ${e.message}`);
    return false;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${katexCss}
    body {
      margin: 0;
      padding: 20px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
    }
    .math-container {
      background: white;
      display: inline-block;
    }
    .katex {
      font-size: 1.2em;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="math-container">
    ${renderedFormula}
  </div>
</body>
</html>
  `;

  try {
    const page = await browser.newPage();
    await page.setContent(html);

    // Get math container dimensions
    const dimensions = await page.evaluate(() => {
      const container = document.querySelector('.math-container');
      const rect = container.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width) + 40,
        height: Math.ceil(rect.height) + 40
      };
    });

    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 2 // Higher resolution
    });

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    await page.close();
    console.log(`  - Math ${mathIndex + 1} exported: ${outputPath}`);
    return true;
  } catch (e) {
    console.error(`  - Math ${mathIndex + 1} failed: ${e.message}`);
    return false;
  }
}

async function exportTableAsImage(tableLines, outputPath, tableIndex, maxTableChars = DEFAULT_TABLE_IMAGE_MAX_CHARS) {
  const rows = parseMarkdownTable(tableLines);
  if (!rows) return;
  const columnWidths = getColumnWidths(rows, maxTableChars);

  // Function to convert markdown and math to HTML
  const convertCellToHtml = (cell) => {
    let html = cell;

    // First, extract and render math formulas
    const mathParts = [];
    html = html.replace(/\$([^\$]+?)\$/g, (match, formula) => {
      try {
        const rendered = katex.renderToString(formula, {
          throwOnError: false,
          displayMode: false
        });
        const placeholder = `__MATH_${mathParts.length}__`;
        mathParts.push(rendered);
        return placeholder;
      } catch (e) {
        return match; // Keep original if rendering fails
      }
    });

    // Then convert markdown formatting
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    // Restore math formulas
    mathParts.forEach((math, idx) => {
      html = html.replace(`__MATH_${idx}__`, math);
    });

    return html;
  };

  const renderCellHtml = (cell, colIndex) => {
    return wrapCellText(cell, columnWidths[colIndex])
      .map(line => convertCellToHtml(line))
      .join('<br>');
  };

  // Get KaTeX CSS
  const katexCss = fs.readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf-8');

  // Create HTML table with black text on white background
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${katexCss}
    body {
      margin: 0;
      padding: 20px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
    }
    table {
      border-collapse: collapse;
      background: white;
      font-size: 16px;
      table-layout: auto;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
      color: #000;
      background: white;
      line-height: 1.55;
      vertical-align: top;
      white-space: nowrap;
      overflow-wrap: normal;
      word-break: normal;
    }
    th {
      background: white;
      font-weight: bold;
    }
    /* Support for bold */
    strong {
      font-weight: bold;
    }
    /* Support for italic */
    em {
      font-style: italic;
    }
    /* Support for code */
    code {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
    }
    /* KaTeX adjustments */
    .katex {
      font-size: 1em;
      color: #000;
    }
  </style>
</head>
<body>
  <table>
    <colgroup>
      ${columnWidths.map(width => `<col style="width: ${width}em;">`).join('\n      ')}
    </colgroup>
    <thead>
      <tr>
        ${columnWidths.map((_width, colIndex) => {
          const html = renderCellHtml(rows[0][colIndex] || '', colIndex);
          return `<th>${html}</th>`;
        }).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${rows.slice(1).map(row => `
      <tr>
        ${columnWidths.map((_width, colIndex) => {
          const html = renderCellHtml(row[colIndex] || '', colIndex);
          return `<td>${html}</td>`;
        }).join('\n        ')}
      </tr>`).join('\n      ')}
    </tbody>
  </table>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html);

    // Get table dimensions
    const dimensions = await page.evaluate(() => {
      const table = document.querySelector('table');
      const rect = table.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width) + 40,
        height: Math.ceil(rect.height) + 40
      };
    });

    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 2 // Higher resolution
    });

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    console.log(`  - Table ${tableIndex + 1} exported: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

function createNoteArticleContent(content, convertTables = false, convertTablesToList = false) {
  let result = content;

  // First, protect and convert markdown tables to KaTeX with placeholders (if enabled)
  const tables = [];

  if (convertTables || convertTablesToList) {
    const lines = content.split('\n');
    const newLines = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this line starts a table
      if (line.trim().startsWith('|')) {
        const tableLines = [];
        let j = i;

        // Collect all consecutive lines that are part of the table
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        // Convert the table if it has at least 2 rows
        if (tableLines.length >= 2) {
          let converted;
          if (convertTablesToList) {
            converted = convertTableToList(tableLines);
          } else {
            converted = convertTableToKaTeX(tableLines);
          }
          const placeholder = `___TABLE_PLACEHOLDER_${tables.length}___`;
          tables.push(converted);
          newLines.push(placeholder);
          i = j;
          continue;
        }
      }

      newLines.push(line);
      i++;
    }

    result = newLines.join('\n');
  }

  // Convert block math: $$...$$\n -> $${...}$$\n
  // Match $$ followed by content (non-greedy), then $$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const trimmedFormula = formula.trim().replace(/\\,/g, '');
    return `$\${${trimmedFormula}}$$`;
  });

  // Convert inline math: $...$ -> $${...}$$
  // This regex avoids matching the already-converted block math
  // Match $ followed by non-$ content, then $
  result = result.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, formula) => {
    const trimmedFormula = formula.trim().replace(/\\,/g, '');
    return `$\${${trimmedFormula}}$$`;
  });

  // Restore table placeholders and replace DOLLARDOLLAR markers with $$ (for KaTeX format)
  tables.forEach((table, index) => {
    const placeholder = `___TABLE_PLACEHOLDER_${index}___`;
    // Replace DOLLARDOLLAR markers with $$ (only applies to KaTeX format)
    const finalTable = table.replace(/DOLLARDOLLAR/g, () => '$$');
    // Use split/join to avoid $$ being treated as special replacement pattern
    result = result.split(placeholder).join(finalTable);
  });

  return result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node create-note-article.js <input-file> [--convert-tables] [--convert-tables-to-list] [--export-tables-as-images] [--export-math-as-images] [--table-image-max-chars 34] [-o output-file]');
    console.error('');
    console.error('This will create a new file with "_note" suffix.');
    console.error('Example: content.md -> content_note.md');
    console.error('');
    console.error('Options:');
    console.error('  --convert-tables           Convert markdown tables to KaTeX array format (default: disabled)');
    console.error('  --convert-tables-to-list   Convert markdown tables to plain text list format (default: disabled)');
    console.error('  --export-tables-as-images  Export markdown tables as PNG images to tables/ folder (default: disabled)');
    console.error('  --export-math-as-images    Export block math ($$...$$) as PNG images to math/ folder (default: disabled)');
    console.error('  --table-image-max-chars N  Maximum table image width in characters, counting vertical borders (default: 34)');
    console.error('  -o <output-file>           Specify custom output file name (optional)');
    process.exit(1);
  }

  const inputFile = args[0];
  const convertTables = args.includes('--convert-tables');
  const convertTablesToList = args.includes('--convert-tables-to-list');
  const exportTablesAsImages = args.includes('--export-tables-as-images');
  const exportMathAsImages = args.includes('--export-math-as-images');
  let tableImageMaxChars = DEFAULT_TABLE_IMAGE_MAX_CHARS;

  const tableImageMaxCharsFlagIndex = args.indexOf('--table-image-max-chars');
  if (tableImageMaxCharsFlagIndex !== -1) {
    const rawValue = args[tableImageMaxCharsFlagIndex + 1];
    const parsedValue = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 8) {
      console.error('Error: --table-image-max-chars must be an integer of 8 or greater.');
      process.exit(1);
    }

    tableImageMaxChars = parsedValue;
  }

  // Check for custom output file
  let customOutputFile = null;
  const outputFlagIndex = args.indexOf('-o');
  if (outputFlagIndex !== -1 && args[outputFlagIndex + 1]) {
    customOutputFile = args[outputFlagIndex + 1];
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  // Read input file
  console.log(`Reading: ${inputFile}`);
  const content = fs.readFileSync(inputFile, 'utf-8');

  // Convert math formulas
  console.log('Converting math formulas to note.com format...');
  if (convertTables) {
    console.log('Table to KaTeX conversion: ENABLED');
  } else if (convertTablesToList) {
    console.log('Table to list conversion: ENABLED');
  } else {
    console.log('Table conversion: DISABLED (use --convert-tables or --convert-tables-to-list to enable)');
  }
  if (exportTablesAsImages) {
    console.log('Table image export: ENABLED');
    console.log(`Table image max width: ${tableImageMaxChars} characters including vertical borders`);
  } else {
    console.log('Table image export: DISABLED (use --export-tables-as-images to enable)');
  }
  if (exportMathAsImages) {
    console.log('Math image export: ENABLED');
  } else {
    console.log('Math image export: DISABLED (use --export-math-as-images to enable)');
  }
  const converted = createNoteArticleContent(content, convertTables, convertTablesToList);

  // Determine output file name
  let outputFile;
  if (customOutputFile) {
    outputFile = customOutputFile;
  } else {
    const dir = path.dirname(inputFile);
    const ext = path.extname(inputFile);
    const base = path.basename(inputFile, ext);
    outputFile = path.join(dir, `${base}_note${ext}`);
  }

  // Write output file
  console.log(`Writing: ${outputFile}`);
  fs.writeFileSync(outputFile, converted, 'utf-8');

  // Export tables as images if requested
  if (exportTablesAsImages) {
    console.log('');
    console.log('Exporting tables as images...');

    // Create tables directory (based on output file location)
    const outputDir = path.dirname(outputFile);
    const tablesDir = path.join(outputDir, 'tables');
    if (!fs.existsSync(tablesDir)) {
      fs.mkdirSync(tablesDir, { recursive: true });
      console.log(`Created directory: ${tablesDir}`);
    }

    // Find all tables in the content
    const lines = content.split('\n');
    const tables = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith('|')) {
        const tableLines = [];
        let j = i;

        while (j < lines.length && lines[j].trim().startsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          tables.push(tableLines);
          i = j;
          continue;
        }
      }

      i++;
    }

    // Export each table
    for (let idx = 0; idx < tables.length; idx++) {
      const imagePath = path.join(tablesDir, `table_${idx + 1}.png`);
      await exportTableAsImage(tables[idx], imagePath, idx, tableImageMaxChars);
    }

    console.log(`Exported ${tables.length} table(s) to ${tablesDir}`);
  }

  // Export math as images if requested
  if (exportMathAsImages) {
    console.log('');
    console.log('Exporting block math as images...');

    // Create math directory (based on output file location)
    const outputDir = path.dirname(outputFile);
    const mathDir = path.join(outputDir, 'math');
    if (!fs.existsSync(mathDir)) {
      fs.mkdirSync(mathDir, { recursive: true });
      console.log(`Created directory: ${mathDir}`);
    }

    // Find all block math in the content
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const mathFormulas = [];
    let match;

    while ((match = blockMathRegex.exec(content)) !== null) {
      mathFormulas.push(match[1]);
    }

    if (mathFormulas.length > 0) {
      // Launch browser once for all math exports
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        // Export each math formula
        for (let idx = 0; idx < mathFormulas.length; idx++) {
          const imagePath = path.join(mathDir, `math_${idx + 1}.png`);
          await exportMathAsImage(mathFormulas[idx], imagePath, idx, browser);
        }
      } finally {
        await browser.close();
      }

      console.log(`Exported ${mathFormulas.length} math formula(s) to ${mathDir}`);
    } else {
      console.log('No block math formulas found to export.');
    }
  }

  // Count conversions
  const blockMathCount = (content.match(/\$\$[\s\S]*?\$\$/g) || []).length;
  const inlineMathCount = (content.match(/(?<!\$)\$(?!\$)[^\$\n]+?\$(?!\$)/g) || []).length;

  console.log('');
  console.log('Conversion complete!');
  if (convertTables || convertTablesToList) {
    const tableCount = (content.match(/(?:^|\n)((?:\|[^\n]+\|\n?)+)/gm) || []).length;
    const format = convertTablesToList ? 'list' : 'KaTeX';
    console.log(`- Markdown tables converted to ${format}: ${tableCount}`);
  }
  console.log(`- Block math formulas converted: ${blockMathCount}`);
  console.log(`- Inline math formulas converted: ${inlineMathCount}`);
}

main();
