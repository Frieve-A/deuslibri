#!/usr/bin/env node

/**
 * Convert markdown math formulas and tables to note.com format
 *
 * Converts:
 * - Block math: $$formula$$ -> $${formula}$$
 * - Inline math: $formula$ -> $${formula}$$
 * - Markdown tables -> KaTeX array format (optional, disabled by default)
 * - Markdown tables -> PNG images (optional, disabled by default)
 *
 * Usage:
 * node convert-math-to-note.js <input-file> [--convert-tables] [--export-tables-as-images]
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const katex = require('katex');

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

async function exportTableAsImage(tableLines, outputPath, tableIndex) {
  const rows = parseMarkdownTable(tableLines);
  if (!rows) return;

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
    }
    th, td {
      border: 1px solid #000;
      padding: 8px 12px;
      text-align: left;
      color: #000;
      background: white;
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
    <thead>
      <tr>
        ${rows[0].map(cell => {
          const html = convertCellToHtml(cell);
          return `<th>${html}</th>`;
        }).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${rows.slice(1).map(row => `
      <tr>
        ${row.map(cell => {
          const html = convertCellToHtml(cell);
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

function convertMathToNoteFormat(content, convertTables = false) {
  let result = content;

  // First, protect and convert markdown tables to KaTeX with placeholders (if enabled)
  const tables = [];

  if (convertTables) {
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
          const katex = convertTableToKaTeX(tableLines);
          const placeholder = `___TABLE_PLACEHOLDER_${tables.length}___`;
          tables.push(katex);
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

  // Restore table placeholders and replace DOLLARDOLLAR markers with $$
  tables.forEach((table, index) => {
    const placeholder = `___TABLE_PLACEHOLDER_${index}___`;
    // Replace DOLLARDOLLAR markers with $$
    const finalTable = table.replace(/DOLLARDOLLAR/g, () => '$$');
    // Use split/join to avoid $$ being treated as special replacement pattern
    result = result.split(placeholder).join(finalTable);
  });

  return result;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node convert-math-to-note.js <input-file> [--convert-tables] [--export-tables-as-images] [-o output-file]');
    console.error('');
    console.error('This will create a new file with "_note" suffix.');
    console.error('Example: content.md -> content_note.md');
    console.error('');
    console.error('Options:');
    console.error('  --convert-tables           Convert markdown tables to KaTeX array format (default: disabled)');
    console.error('  --export-tables-as-images  Export markdown tables as PNG images to tables/ folder (default: disabled)');
    console.error('  -o <output-file>           Specify custom output file name (optional)');
    process.exit(1);
  }

  const inputFile = args[0];
  const convertTables = args.includes('--convert-tables');
  const exportTablesAsImages = args.includes('--export-tables-as-images');

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
    console.log('Table conversion: ENABLED');
  } else {
    console.log('Table conversion: DISABLED (use --convert-tables to enable)');
  }
  if (exportTablesAsImages) {
    console.log('Table image export: ENABLED');
  } else {
    console.log('Table image export: DISABLED (use --export-tables-as-images to enable)');
  }
  const converted = convertMathToNoteFormat(content, convertTables);

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
      await exportTableAsImage(tables[idx], imagePath, idx);
    }

    console.log(`Exported ${tables.length} table(s) to ${tablesDir}`);
  }

  // Count conversions
  const blockMathCount = (content.match(/\$\$[\s\S]*?\$\$/g) || []).length;
  const inlineMathCount = (content.match(/(?<!\$)\$(?!\$)[^\$\n]+?\$(?!\$)/g) || []).length;

  console.log('');
  console.log('Conversion complete!');
  if (convertTables) {
    const tableCount = (content.match(/(?:^|\n)((?:\|[^\n]+\|\n?)+)/gm) || []).length;
    console.log(`- Markdown tables converted: ${tableCount}`);
  }
  console.log(`- Block math formulas converted: ${blockMathCount}`);
  console.log(`- Inline math formulas converted: ${inlineMathCount}`);
}

main();
