/**
 * Markdownファイルの見出し（#）の前にページ区切り（---）を挿入するスクリプト
 *
 * ルール:
 * - h2（##）の前には必ずページ区切りを挿入
 * - h3以下（###, ####, ...）の前には、前回のページ区切りから約1,200-1,400文字経過している場合のみ挿入
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

// 日本語の見開き2ページ相当の文字数（目安）
const MIN_CHARS_FOR_BREAK = 1200;

/**
 * 日本語テキストの文字数をカウント（空白・記号を除く実質的な文字数）
 * マークダウン記法も除外
 */
function countJapaneseChars(text) {
  // マークダウン記法を削除
  let cleaned = text
    .replace(/^#+\s+/gm, '')        // 見出し記号
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 太字
    .replace(/\*([^*]+)\*/g, '$1')     // 斜体
    .replace(/`([^`]+)`/g, '$1')       // インラインコード
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // リンク
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // 画像
    .replace(/^>\s*/gm, '')            // 引用
    .replace(/^[-*+]\s+/gm, '')        // リスト
    .replace(/^\d+\.\s+/gm, '');       // 番号付きリスト

  // 空白・改行を除去して文字数をカウント
  cleaned = cleaned.replace(/\s+/g, '');

  return cleaned.length;
}

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
  let charsSinceLastBreak = 0; // 最後のページ区切りからの文字数

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const trimmedLine = line.trim();

    // 見出しレベルを判定
    const h2Match = /^##\s+/.test(trimmedLine);
    const h3PlusMatch = /^#{3,6}\s+/.test(trimmedLine);
    const isHeading = h2Match || h3PlusMatch || /^#\s+/.test(trimmedLine);

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
        charsSinceLastBreak = 0;
      } else if (h2Match && hasContentSinceLastBreak) {
        // h2の場合は必ずページ区切りを挿入（本文があれば）
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        result.push('---');
        result.push('');
        result.push(line);
        hasContentSinceLastBreak = false;
        charsSinceLastBreak = 0;
      } else if (h3PlusMatch && hasContentSinceLastBreak && charsSinceLastBreak >= MIN_CHARS_FOR_BREAK) {
        // h3以下の場合は文字数が閾値を超えている場合のみページ区切りを挿入
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        result.push('---');
        result.push('');
        result.push(line);
        hasContentSinceLastBreak = false;
        charsSinceLastBreak = 0;
      } else {
        // ページ区切りを入れずに見出しを追加
        result.push(line);
      }
    } else {
      result.push(line);
      if (isContent) {
        hasContentSinceLastBreak = true;
        charsSinceLastBreak += countJapaneseChars(line);
      }
    }
  }

  // 結果を書き込む
  const outputContent = result.join('\n');
  fs.writeFileSync(filePath, outputContent, 'utf-8');

  console.log(`ページ区切りを挿入しました: ${filePath}`);

  // 統計情報
  const h2Count = normalizedLines.filter(l => /^##\s+/.test(l.trim())).length;
  const h3PlusCount = normalizedLines.filter(l => /^#{3,6}\s+/.test(l.trim())).length;
  const newBreaks = result.filter(l => l.trim() === '---').length;

  console.log(`  h2見出し数: ${h2Count}`);
  console.log(`  h3以下見出し数: ${h3PlusCount}`);
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
