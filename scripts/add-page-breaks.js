/**
 * Markdownファイルの見出し（#）の前にページ区切り（---）を挿入するスクリプト
 *
 * ルール:
 * - 見出しの前にページ区切りを挿入
 * - ただし、本文（見出し・空行・ページ区切り以外の行）が登場するまでは次の区切りを打たない
 * - これにより、見出しだけのページが作られることを防ぐ
 *
 * 使用方法:
 *   node scripts/add-page-breaks.js <markdown-file-path>
 *
 * 例:
 *   node scripts/add-page-breaks.js content/books/2025-12/gods-bootloader/ja/content.md
 */

const fs = require('fs');
const path = require('path');

function addPageBreaks(filePath) {
  // ファイルを読み込む
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // まず既存のページ区切り（---）を削除
  const cleanedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '---') {
      // ページ区切りをスキップ
      // 前後の空行も調整（連続する空行を1つに）
      continue;
    }
    cleanedLines.push(lines[i]);
  }

  // 連続する空行を1つにまとめる
  const normalizedLines = [];
  let prevWasEmpty = false;
  for (const line of cleanedLines) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevWasEmpty) {
      continue; // 連続する空行をスキップ
    }
    normalizedLines.push(line);
    prevWasEmpty = isEmpty;
  }

  const result = [];
  let isFirstHeading = true;
  let hasContentSinceLastBreak = true; // 最初は本文があるとみなす

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const trimmedLine = line.trim();

    // 見出し行かどうかチェック（# で始まる行）
    const isHeading = /^#{1,6}\s+/.test(trimmedLine);

    // 空行かどうか
    const isEmpty = trimmedLine === '';

    // 本文行かどうか（見出しでも空行でもない行）
    const isContent = !isHeading && !isEmpty;

    if (isHeading) {
      if (isFirstHeading) {
        // 最初の見出しの前にはページ区切りを入れない
        isFirstHeading = false;
        result.push(line);
        hasContentSinceLastBreak = false; // 見出し後は本文待ち状態
      } else if (hasContentSinceLastBreak) {
        // 本文があった場合のみページ区切りを挿入
        // 直前が空行でなければ空行を追加
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        result.push('---');
        result.push('');
        result.push(line);
        hasContentSinceLastBreak = false; // 見出し後は本文待ち状態
      } else {
        // まだ本文がない場合は区切りを入れずに見出しを追加
        result.push(line);
      }
    } else {
      result.push(line);
      if (isContent) {
        hasContentSinceLastBreak = true; // 本文が見つかった
      }
    }
  }

  // 結果を書き込む
  const outputContent = result.join('\n');
  fs.writeFileSync(filePath, outputContent, 'utf-8');

  console.log(`ページ区切りを挿入しました: ${filePath}`);

  // 統計情報
  const headingCount = normalizedLines.filter(l => /^#{1,6}\s+/.test(l.trim())).length;
  const newBreaks = result.filter(l => l.trim() === '---').length;

  console.log(`  見出し数: ${headingCount}`);
  console.log(`  挿入されたページ区切り: ${newBreaks}`);
}

// コマンドライン引数からファイルパスを取得
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('使用方法: node scripts/add-page-breaks.js <markdown-file-path>');
  console.log('例: node scripts/add-page-breaks.js content/books/2025-12/gods-bootloader/ja/content.md');
  process.exit(1);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(`エラー: ファイルが見つかりません: ${filePath}`);
  process.exit(1);
}

addPageBreaks(filePath);
