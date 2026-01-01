/**
 * Markdownファイルの見出し（#）の前にページ区切り（---）を挿入するスクリプト
 *
 * ルール:
 * - h2（##）の前には必ずページ区切りを挿入
 * - h3（###）の前には必ずページ区切りを挿入
 * - h4以下（####, ...）の前には、前回のページ区切りから約1,200-1,400文字経過している場合のみ挿入
 * - ただし、本文（見出し・空行・ページ区切り以外の行）が登場するまでは次の区切りを打たない
 * - これにより、見出しだけのページが作られることを防ぐ
 * - Part（#）の後、最初の章（##）や節（###）の前では改ページしない（間に本文があっても）
 * - 章（##）の後、最初の節（###）の前では改ページしない（間に本文があっても）
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
  let lastParentLevel = 0; // 直前の親見出しレベル（h1またはh2）
  let hasChildAfterParent = false; // 親見出し（h1/h2）の後に子見出し（h2/h3）が出たか

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const trimmedLine = line.trim();

    // 見出しレベルを判定
    const h1Match = /^#\s+/.test(trimmedLine) && !/^##/.test(trimmedLine);
    const h2Match = /^##\s+/.test(trimmedLine) && !/^###/.test(trimmedLine);
    const h3Match = /^###\s+/.test(trimmedLine) && !/^####/.test(trimmedLine);
    const h4PlusMatch = /^#{4,6}\s+/.test(trimmedLine);
    const isHeading = h1Match || h2Match || h3Match || h4PlusMatch;

    // 空行かどうか
    const isEmpty = trimmedLine === '';

    // 本文行かどうか（見出しでも空行でもない行）
    const isContent = !isHeading && !isEmpty;

    if (isHeading) {
      // 現在の見出しレベルを取得
      let currentLevel = 0;
      if (h1Match) currentLevel = 1;
      else if (h2Match) currentLevel = 2;
      else if (h3Match) currentLevel = 3;
      else if (h4PlusMatch) currentLevel = 4;

      // Part（h1）の後の最初のh2/h3、または章（h2）の後の最初のh3では改ページしない
      // （間に本文があっても、その親の下で最初の子見出しなら改ページしない）
      const isFirstChildAfterParent = !hasChildAfterParent && (
        (lastParentLevel === 1 && (currentLevel === 2 || currentLevel === 3)) ||
        (lastParentLevel === 2 && currentLevel === 3)
      );

      if (isFirstHeading) {
        // 最初の見出しの前にはページ区切りを入れない
        isFirstHeading = false;
        result.push(line);
        hasContentSinceLastBreak = false; // 見出し後は本文待ち状態
        charsSinceLastBreak = 0;
      } else if (isFirstChildAfterParent) {
        // 親見出しの後の最初の子見出しでは改ページしない
        result.push(line);
        hasChildAfterParent = true;
      } else if ((h2Match || h3Match) && hasContentSinceLastBreak) {
        // h2, h3の場合は必ずページ区切りを挿入（本文があれば）
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        result.push('---');
        result.push('');
        result.push(line);
        hasContentSinceLastBreak = false;
        charsSinceLastBreak = 0;
      } else if (h4PlusMatch && hasContentSinceLastBreak && charsSinceLastBreak >= MIN_CHARS_FOR_BREAK) {
        // h4以下の場合は文字数が閾値を超えている場合のみページ区切りを挿入
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

      // 親見出しレベルを更新（h1またはh2の場合）
      if (h1Match || h2Match) {
        lastParentLevel = currentLevel;
        hasChildAfterParent = false;
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
  const h2Count = normalizedLines.filter(l => /^##\s+/.test(l.trim()) && !/^###/.test(l.trim())).length;
  const h3Count = normalizedLines.filter(l => /^###\s+/.test(l.trim()) && !/^####/.test(l.trim())).length;
  const h4PlusCount = normalizedLines.filter(l => /^#{4,6}\s+/.test(l.trim())).length;
  const newBreaks = result.filter(l => l.trim() === '---').length;

  console.log(`  h2見出し数: ${h2Count}`);
  console.log(`  h3見出し数: ${h3Count}`);
  console.log(`  h4以下見出し数: ${h4PlusCount}`);
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
