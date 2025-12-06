# 縦書きページングモード技術仕様書

## 概要

このドキュメントは、日本語書籍の縦書き表示モード（`writing-mode: vertical-rl`）におけるページ内スクロールとページ遷移の動作仕様を定義します。

**重要**: この仕様は、scrollLeft値とユーザーから見える表示位置の関係について、混乱を避けるために正確に記録されています。

## 基本概念

### 1. 縦書きモード (vertical-rl) とは

- CSS `writing-mode: vertical-rl` を使用
- テキストは縦方向に配置され、右から左に進む
- 日本語の伝統的な読書方向に対応

### 2. 読書の方向

```
┌─────────────────────────────────┐
│                    ↓ 本文      │
│  読    ↓ 本文      ↓ 本文      │
│  み    ↓ 本文      ↓ 本文      │
│   終    ↓ 本文                  │
│  わ                読           │
│  り                み           │
│                    始           │
│                    め           │
│  ← ← ← ← ← ← ← ← ← ← ← ←   │
│  読み進める方向（右から左へ）     │
└─────────────────────────────────┘
```

- **読み始め**: 右端のコンテンツ
- **読み進める**: 右から左へ
- **読み終わり**: 左端のコンテンツ

## scrollLeft の動作仕様（Firefox基準）

### 重要な理解ポイント

`scrollLeft` は**スクロール位置**を示す値であり、**表示されているコンテンツの位置**とは逆の関係にあります。

### scrollLeft値の範囲

```
scrollLeft値の範囲:
  0 (最小値) ←→ -maxScroll (最大値)

maxScroll = scrollWidth - clientWidth
```

### scrollLeft値と表示コンテンツの関係

| scrollLeft値 | スクロール位置 | 表示されるコンテンツ | 読書の状態 |
|-------------|-------------|-----------------|----------|
| `0` | スクロール領域の**左端** | **右端**のコンテンツ | **読み始め** (初期位置) |
| `-100` | スクロール領域の中間 | 中央のコンテンツ | 読書中 |
| `-maxScroll` (例: -201) | スクロール領域の**右端** | **左端**のコンテンツ | **読み終わり** |

### 視覚的な理解

```
スクロール領域の内部構造:

scrollLeft = 0 の場合:
┌─────────[表示ウィンドウ]─────────┐
│ 右端コンテンツ | 中央 | 左端     │
│ (読み始め)     |      | (非表示)  │
└─────────────────────────────────┘
↑
スクロール位置は左端

scrollLeft = -201 の場合:
┌─────────────────────────────────┐
│ 右端      | 中央 | 左端コンテンツ │
│ (非表示)   |      | (読み終わり)   │
└─────────[表示ウィンドウ]─────────┘
                                  ↑
                          スクロール位置は右端
```

## エッジ検出ロジック

### コード内の変数名の意味

```typescript
// これらの変数は「表示されているコンテンツの位置」を示す
isAtRightEdgeContentRef.current  // 右端コンテンツが表示されている = 読み始め
isAtLeftEdgeContentRef.current   // 左端コンテンツが表示されている = 読み終わり
```

### エッジ判定の実装

```typescript
const edgeThreshold = 50 // ピクセル単位の閾値
const scrollLeft = prose.scrollLeft
const maxScroll = scrollableWidth - visibleWidth

// 右端コンテンツが表示されているか（読み始め位置）
// scrollLeft が 0 に近い = スクロール位置が左端 = 右端コンテンツ表示
isAtRightEdgeContentRef.current = scrollLeft >= -edgeThreshold

// 左端コンテンツが表示されているか（読み終わり位置）
// scrollLeft が -maxScroll に近い = スクロール位置が右端 = 左端コンテンツ表示
isAtLeftEdgeContentRef.current = scrollLeft <= -(maxScroll - edgeThreshold)
```

### 判定例（maxScroll = 201 の場合）

| scrollLeft | isAtRightEdgeContent | isAtLeftEdgeContent | 状態 |
|-----------|---------------------|---------------------|-----|
| `0` | `true` (0 >= -50) | `false` (0 > -151) | 右端コンテンツ表示（読み始め） |
| `-50` | `true` (-50 >= -50) | `false` | 右端コンテンツ付近 |
| `-51` | `false` | `false` | 中央（スクロール中） |
| `-150` | `false` | `false` | 中央（スクロール中） |
| `-151` | `false` | `true` (-151 <= -151) | 左端コンテンツ付近 |
| `-201` | `false` | `true` (-201 <= -151) | 左端コンテンツ表示（読み終わり） |

## ページ遷移とスクロールの統合

### 基本原則

1. **ページ内にスクロール余地がある場合**: まずページ内スクロール
2. **コンテンツの端に到達している場合のみ**: フリック操作でページ遷移

### フリック操作の定義

```typescript
const swipeDistance = touchStartX - touchEndX
// swipeDistance < 0: 右フリック（右方向へのスワイプ）
// swipeDistance > 0: 左フリック（左方向へのスワイプ）
```

### ページ遷移ロジック

```typescript
// 左端コンテンツが表示されている状態で右フリック → 次ページ（読み進める）
if (swipeDistance < 0 && isAtLeftEdgeContentRef.current) {
  goToNextPage()
}

// 右端コンテンツが表示されている状態で左フリック → 前ページ（戻る）
if (swipeDistance > 0 && isAtRightEdgeContentRef.current) {
  goToPrevPage()
}
```

### 操作フローチャート

```
┌─────────────────────────────────────┐
│ ユーザーが画面をタッチ              │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ touchStart時点のscrollLeftを記録    │
│ エッジ状態を判定                    │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ ユーザーが指を動かす                │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ touchEnd でフリック距離を計算       │
└───────────┬─────────────────────────┘
            │
            ▼
    ┌───────┴───────┐
    │               │
    ▼               ▼
[エッジ状態]    [中央状態]
    │               │
    │               └→ 何もしない
    │                  （ブラウザの
    │                   スクロール処理）
    │
    ▼
┌─────────────────────────────────────┐
│ フリック方向とエッジ位置を確認      │
└───────────┬─────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
[左端コンテンツ] [右端コンテンツ]
+ 右フリック     + 左フリック
    │               │
    ▼               ▼
  Next Page      Prev Page
 （読み進める）    （戻る）
```

## 初期スクロール位置

### ページ切り替え時の動作

新しいページを表示する際、自動的に右端コンテンツ（読み始め位置）にスクロールします。

```typescript
useEffect(() => {
  if (!loading && isVertical && contentRef.current && isPagination) {
    setTimeout(() => {
      const prose = contentRef.current.firstElementChild as HTMLElement
      if (prose) {
        const maxScroll = prose.scrollWidth - prose.clientWidth
        // 右端コンテンツを表示するため、scrollLeftを最大負値に設定
        prose.scrollLeft = -maxScroll
      }
    }, 0)
  }
}, [currentPage, loading, isVertical, isPagination])
```

## HTML/CSS構造

### DOM構造

```html
<div ref={contentRef} class="overflow-x-auto">
  <!-- ↑ コンテナ: スクロール可能な領域を定義 -->

  <div class="prose" style="writing-mode: vertical-rl">
    <!-- ↑ 実際のスクロール要素: この要素のscrollLeftを使用 -->

    <!-- コンテンツ -->
  </div>
</div>
```

### 重要な実装ポイント

1. **contentRef vs prose要素**
   - `contentRef`: 外側のコンテナ（`overflow-x-auto`）
   - `prose`: 実際にスクロールする内側の要素
   - **scrollLeftを取得する対象**: `prose`要素（`contentRef.firstElementChild`）

2. **スタイル設定**
   ```css
   .prose[style*="writing-mode: vertical-rl"] {
     height: 100% !important;
     box-sizing: border-box;
   }
   ```

## タイポグラフィと余白

### 設計原則: 縦書きモードにおける論理プロパティ

`writing-mode: vertical-rl`では、CSSの論理プロパティが物理プロパティに異なる方法でマッピングされます：

| 論理プロパティ | 横書きモード | 縦書きモード |
|--------------|------------|------------|
| `margin-block`（上下） | 物理的な上下 | 物理的な**左右** |
| `margin-inline`（左右） | 物理的な左右 | 物理的な**上下** |

Tailwindの`.prose`クラスは物理的なmargin-top/bottomプロパティを使用しているため、縦書きモードでは要素間の適切な余白を確保するために明示的な水平マージンが必要です。

### ブロック要素のマージン

#### 縦書きモード（日本語）

すべてのブロック要素は`margin-top`/`margin-bottom`ではなく`margin-left`/`margin-right`が必要です：

```css
/* 段落 */
.prose[style*="writing-mode: vertical-rl"] p {
  margin-left: 1.25em !important;
  margin-right: 0 !important;
}

/* 見出し */
.prose[style*="writing-mode: vertical-rl"] h1,
.prose[style*="writing-mode: vertical-rl"] h2,
/* ... h3-h6 ... */ {
  margin-left: 1.5em !important;
  margin-right: 0.5em !important;
}

/* リスト、コードブロック、引用 */
.prose[style*="writing-mode: vertical-rl"] pre,
.prose[style*="writing-mode: vertical-rl"] ol,
.prose[style*="writing-mode: vertical-rl"] ul,
.prose[style*="writing-mode: vertical-rl"] blockquote {
  margin-left: 1.25em !important;
  margin-right: 0.5em !important;
}
```

#### 横書きモード

横書きモードでも一貫した余白を確保するために明示的なマージンが必要です：

```css
.prose[style*="writing-mode: horizontal-tb"] p {
  margin-top: 1.25em !important;
  margin-bottom: 0 !important;
}

.prose[style*="writing-mode: horizontal-tb"] h1,
/* ... h2-h6 ... */ {
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
}

.prose[style*="writing-mode: horizontal-tb"] pre,
.prose[style*="writing-mode: horizontal-tb"] ol,
.prose[style*="writing-mode: horizontal-tb"] ul,
.prose[style*="writing-mode: horizontal-tb"] blockquote {
  margin-top: 1.25em !important;
  margin-bottom: 0.5em !important;
}
```

### 画像のレイアウト

#### 問題: 段落内の画像

Markdownで画像の次の行にキャプションがある場合（空行なし）：

```markdown
![説明](./images/image.jpg)
*キャプションテキスト*
```

これは`<img>`と`<em>`が同じ`<p>`タグ内に含まれるHTMLを生成します：

```html
<p><img src="..."><em>キャプションテキスト</em></p>
```

縦書きモードでは、キャプションが画像の下（読み順で）ではなく横に表示されてしまいます。

#### 解決策: 画像を含む段落にFlexコンテナを使用

```css
/* 画像を含む段落はflexで画像とキャプションを分離 */
.prose[style*="writing-mode: vertical-rl"] p:has(img) {
  display: flex !important;
  flex-direction: column !important;  /* vertical-rlでは、column = 水平方向のスタック */
  align-items: center !important;
  margin-left: 1.5rem !important;
  margin-right: 1.5rem !important;
}

.prose[style*="writing-mode: vertical-rl"] img {
  max-height: 70vh !important;
  max-width: 400px !important;
  height: auto !important;
  width: auto !important;
  object-fit: contain;
}
```

**なぜ`flex-direction: column`が縦書きモードで機能するか**：
- `writing-mode: vertical-rl`では、論理的な「column」方向が物理的な水平方向にマッピングされる
- これにより、flexアイテム（画像とキャプション）が左から右にスタックされ、読み進める方向と一致する

### 複数の空行の保持

#### 問題: 標準Markdownは追加の空行を無視する

標準のMarkdownパーサーは複数の連続した空行を単一の段落区切りとして扱います：

```markdown
段落1。



段落2。（3つの空行は無視される）
```

出力：
```html
<p>段落1。</p>
<p>段落2。</p>
```

#### 解決策: 空行をスペーサー要素に前処理

`markdownToHtml`関数はパース前に追加の空行をスペーサーマーカーに変換します：

```typescript
// 前処理: 複数の連続した空行をスペーサーマーカーに変換
const SPACER_MARKER = ':::SPACER:::'
let processedMarkdown = markdown.replace(/\n(\n{2,})/g, (_match, blanks) => {
  const extraLines = blanks.length - 1
  return '\n\n' + (SPACER_MARKER + '\n\n').repeat(extraLines)
})

// 後処理: マーカーをスペーサーdivに変換
html = html.replace(
  /<p>:::SPACER:::<\/p>/g,
  '<div class="spacer" aria-hidden="true"></div>'
)
```

#### スペーサー要素のスタイリング

```css
/* 横書きモード: 縦方向の余白 */
.prose .spacer {
  display: block;
  height: 1em;
}

/* 縦書きモード: 横方向の余白 */
.prose[style*="writing-mode: vertical-rl"] .spacer {
  height: auto;
  width: 1em;
  min-width: 1em;
}
```

#### Markdownでの使用方法

著者は複数の空行を使用して追加の視覚的な余白を追加できます：

```markdown
シーンの終わり。



新しいシーンの始まり。（3つの空行 = 2つのスペーサー）
```

これにより、レンダリングされた出力に目に見えるギャップが作成され、シーン区切りや劇的な間を表現するのに役立ちます。

## トラブルシューティング

### よくある混乱ポイント

#### 1. "scrollLeft = 0 が右端なのか左端なのか？"

**答え**: scrollLeft = 0 は**スクロール位置の左端**ですが、これは**右端コンテンツが表示される**状態です。

- スクロール位置: 左端
- 表示コンテンツ: 右端
- 読書状態: 読み始め

#### 2. "右フリックでNextなのか、左フリックでNextなのか？"

**答え**: **左端コンテンツが表示されている状態**で**右フリック**すると**Next**です。

- 左端コンテンツ表示 = 読み終わり位置
- 右フリック = 読み進める方向
- Next = 次のページへ進む

#### 3. "変数名が実態と逆では？"

変数名は**表示されているコンテンツ**を基準に命名されています：

- `isAtRightEdgeContentRef` = 右端コンテンツが表示中
- `isAtLeftEdgeContentRef` = 左端コンテンツが表示中

これは scrollLeft 値とは逆の関係ですが、ユーザー視点では正しい表現です。

## 実装ファイル

### 主要ファイル

BookReader機能はモジュール化されたコンポーネントとフックに分割されています：

1. **src/components/BookReader.tsx**
   - リーダー機能全体を統括するメインコンポーネント
   - カスタムフックを使用した状態管理とイベント処理

2. **src/components/reader/**
   - `ReaderHeader.tsx` - ヘッダーUI（タイトル、ブックマーク、共有ボタン）
   - `ReaderContent.tsx` - コンテンツ表示（縦書き/横書き、ページ/スクロール）
   - `PageNavigation.tsx` - ページナビゲーションUIとプログレスバー

3. **src/hooks/**
   - `useBookProgress.ts` - 読書進捗管理（保存・復元）
   - `usePageNavigation.ts` - ページ遷移とキーボード操作
   - `useTouchNavigation.ts` - タッチイベント処理（スワイプ、タップ、長押し）
   - `useMouseNavigation.ts` - マウスイベント処理（クリック、ドラッグ選択）
   - `useProgressBar.ts` - プログレスバーのドラッグ操作
   - `useVerticalLayout.ts` - 縦書きモードのレイアウト管理
   - `useAutoScroll.ts` - 自動スクロール機能（速度制御、自動ページ送り）

4. **src/lib/reader/**
   - `constants.ts` - 設定定数（閾値、時間など）
   - `utils.ts` - ユーティリティ関数（テキストサイズ計算、選択範囲検出）

5. **src/app/globals.css** (行110-144)
   - 縦書きモードのCSS調整
   - 画像サイズ制御

### 関連する状態管理

```typescript
// src/lib/stores/useReadingStore.ts
settings.writingMode // 'horizontal' | 'vertical'
settings.displayMode // 'pagination' | 'scroll'
```

## テストケース

### 手動テストシナリオ

#### シナリオ1: 通常のページ内スクロール

1. 縦書きモードで書籍を開く
2. ページの右端から読み始める
3. 右方向にゆっくりフリック → ページ内が左にスクロール
4. コンテンツの左端まで読める

**期待結果**: ページ遷移せず、スクロールのみ発生

#### シナリオ2: 読み終わり後の次ページ遷移

1. ページの左端まで読み進める（scrollLeft ≈ -maxScroll）
2. 右方向に素早くフリック（50px以上）

**期待結果**: 次のページに遷移

#### シナリオ3: 読み始め位置での前ページ遷移

1. ページの右端にいる（scrollLeft ≈ 0）
2. 左方向に素早くフリック（50px以上）

**期待結果**: 前のページに遷移

#### シナリオ4: 画面に収まるコンテンツ

1. コンテンツが画面幅に収まるページを開く
2. 左右どちらにでもフリック可能

**期待結果**: 左フリックでPrev、右フリックでNext

## まとめ

### キーポイント

1. **scrollLeft は表示位置の逆**: `scrollLeft = 0` で右端コンテンツ表示
2. **変数名はユーザー視点**: コンテンツの位置で命名
3. **エッジ到達時のみページ遷移**: 中央ではスクロールのみ
4. **読書方向と一貫性**: 右フリックで読み進める（Next）

### 用語の統一

| 用語 | 意味 | scrollLeft値 |
|-----|------|------------|
| 右端コンテンツ | 読み始めの部分 | ≈ 0 |
| 左端コンテンツ | 読み終わりの部分 | ≈ -maxScroll |
| 右フリック | 読み進める操作 | swipeDistance < 0 |
| 左フリック | 戻る操作 | swipeDistance > 0 |

---

**最終更新**: 2025-12-03
**作成理由**: scrollLeft値と表示位置の混乱を防ぎ、将来のメンテナンスを容易にするため
**更新履歴**:
- 2025-12-03: 「タイポグラフィと余白」セクションを追加。縦書き/横書きモードのブロック要素マージン、Flexコンテナを使用した画像レイアウト、Markdownの複数空行を保持するスペーサー要素について文書化。

**English version**: [docs/VERTICAL_MODE_SPEC.md](../VERTICAL_MODE_SPEC.md)
