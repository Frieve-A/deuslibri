# DeusLibri プロジェクト実装計画書

[English](../PROJECT_PLAN.md)

## プロジェクト概要

DeusLibriは、GitHub Actionsで自動ビルド・デプロイされる静的電子書籍サイトです。
Markdownで執筆された書籍を、洗練されたUIで無料公開し、Google AdSenseによる収益化を実現します。

## 1. 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
  - SSG (Static Site Generation) でGitHub Pagesにデプロイ可能
  - SEO対応が容易
  - React Server Componentsでパフォーマンス最適化
- **スタイリング**: Tailwind CSS + shadcn/ui
  - クリーンで保守性の高いデザインシステム
  - レスポンシブ対応が容易
- **状態管理**: Zustand (軽量でシンプル)
- **検索機能**: Fuse.js (クライアントサイド全文検索)
- **Markdown処理**: unified + remark + rehype
  - 縦書き対応のカスタムプラグイン実装

### バックエンド・ビルド
- **Static Site Generator**: Next.js SSG
- **CI/CD**: GitHub Actions
- **ホスティング**: GitHub Pages / Vercel / Cloudflare Pages
- **画像最適化**: next/image + sharp

### データ管理
- **メタデータ**: YAML形式
- **本文**: Markdown
- **検索インデックス**: ビルド時に生成したJSON

## 2. ディレクトリ構造

```
deuslibri/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # GitHub Actions設定
├── content/                           # 電子書籍コンテンツ
│   └── books/
│       └── YYYY-MM/                   # 出版年月
│           └── {book-id}/             # 書籍ID
│               ├── ja/                # 言語別
│               │   ├── metadata.yml   # メタデータ
│               │   ├── content.md     # 本文
│               │   └── images/        # 画像
│               │       ├── cover.jpg
│               │       └── *.jpg
│               ├── en/
│               └── ...
├── docs/                              # プロジェクトドキュメント
│   ├── PROJECT_PLAN.md               # 英語版計画書
│   ├── WRITING_GUIDE.md              # 英語版執筆ガイド
│   ├── ja/                           # 日本語ドキュメント
│   │   ├── PROJECT_PLAN.md           # 本ドキュメント
│   │   └── WRITING_GUIDE.md          # 執筆ガイド
│   └── README.md                     # ドキュメント案内
├── public/
│   └── ads.txt                        # Google AdSense設定
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # カタログトップ
│   │   ├── book/
│   │   │   └── [year]/
│   │   │       └── [month]/
│   │   │           └── [id]/
│   │   │               └── [lang]/
│   │   │                   ├── page.tsx    # 書籍閲覧
│   │   │                   └── [page]/
│   │   │                       └── page.tsx # パーマリンク
│   │   ├── settings/
│   │   │   └── page.tsx               # 設定画面
│   │   └── api/
│   │       └── search/
│   │           └── route.ts           # 検索API
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── catalog/
│   │   │   ├── BookGrid.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TagFilter.tsx
│   │   │   └── BookCard.tsx
│   │   ├── reader/
│   │   │   ├── BookReader.tsx
│   │   │   ├── VerticalReader.tsx
│   │   │   ├── HorizontalReader.tsx
│   │   │   ├── PageControls.tsx
│   │   │   └── TableOfContents.tsx
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx
│   │   └── ads/
│   │       └── AdSenseUnit.tsx
│   ├── lib/
│   │   ├── books/
│   │   │   ├── loader.ts              # ビルド時書籍読み込み
│   │   │   ├── search-index.ts        # 検索インデックス生成
│   │   │   └── metadata.ts            # メタデータ型定義
│   │   ├── storage/
│   │   │   └── local-storage.ts       # LocalStorage操作
│   │   ├── markdown/
│   │   │   └── processor.ts           # Markdown処理
│   │   └── utils.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── reader.css                 # 縦書きCSS等
│   └── types/
│       └── book.ts
├── scripts/
│   └── generate-search-index.ts       # ビルド時スクリプト
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 3. データフォーマット

### metadata.yml (書籍メタデータ)
```yaml
id: "example-book-001"
title: "サンプル書籍タイトル"
author: "著者名"
publishDate: "2025-12"
language: "ja"
tags:
  - "ファンタジー"
  - "冒険"
summary: "この本は..."
description: "より詳細な説明..."
recommendText: "このような読者におすすめ..."
coverImage: "./images/cover.jpg"
pageCount: 250
estimatedReadingTime: 180  # 分
isbn: ""  # オプション
series: ""  # シリーズ名（オプション）
seriesNumber: 1  # シリーズ番号（オプション）
```

### content.md (本文)
```markdown
# 第1章 始まり

![挿絵の説明](./images/illustration-01.jpg)

本文がここに続く...

---
page-break
---

# 第2章 旅立ち

...
```

## 4. 機能要件

### 4.1 カタログ機能
- グリッド/リスト表示切り替え
- 全文検索（タイトル、著者、概要、タグ）
- タグによる絞り込み（複数選択可）
- ソート機能（新着順、人気順、タイトル順）
- 著者ページ: 同一著者の書籍一覧
- シリーズ機能: シリーズものをまとめて表示
- 言語フィルタ: 多言語対応時の言語選択
- 読了ステータス: 未読/読書中/読了の管理
- レーティング: LocalStorageで個人的な評価を保存

### 4.2 閲覧機能
- 縦書き/横書き切り替え（日本語のみ）
- ページ送り/無限スクロール
- フォントサイズ調整（小/中/大/特大）
- パーマリンク（例: `/book/2025/12/book-id/ja/page/15`）
- お気に入りボタン
- SNSシェア（Twitter, Facebook, LINE, はてブ）
- 目次ナビゲーション: サイドバーまたはドロワーで章移動
- 読書進捗バー: ページトップに進捗表示
- ブックマーク機能: 複数のしおりを保存可能
- フォント選択: 明朝体/ゴシック体/游明朝など
- 行間・余白調整: 読みやすさのカスタマイズ
- ダークモード: 目に優しい夜間モード
- 音声読み上げ: Web Speech API活用
- キーボードショートカット: 矢印キーでページ送り等
- フルスクリーンモード: 没入型読書体験

### 4.3 設定機能
- 表示方向（縦書き/横書き）
- ページモード（ページ送り/スクロール）
- フォントサイズ
- テーマ（ライト/ダーク/セピア）
- フォントファミリー
- 行間
- 余白
- アニメーション有効/無効
- データエクスポート/インポート（読書履歴の移行）

### 4.4 LocalStorage保存データ構造
```typescript
interface UserData {
  favorites: string[];  // 書籍ID配列
  recentBooks: {
    bookId: string;
    lastPage: number;
    lastRead: Date;
    progress: number;  // 0-100%
  }[];
  bookmarks: {
    [bookId: string]: {
      page: number;
      note?: string;
      createdAt: Date;
    }[];
  };
  readingStatus: {
    [bookId: string]: 'unread' | 'reading' | 'completed';
  };
  settings: {
    writingMode: 'vertical' | 'horizontal';
    pageMode: 'pagination' | 'scroll';
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    fontFamily: string;
    lineHeight: number;
    theme: 'light' | 'dark' | 'sepia';
  };
}
```

### 4.5 Google AdSense統合
- カタログページ: グリッド間に自然に配置
- 閲覧ページ: 章の区切りに配置
- サイドバー広告（PC表示時）
- コンポーネント化して管理
- レスポンシブ広告ユニット使用

## 5. GitHub Actions CI/CDパイプライン

### .github/workflows/deploy.yml
```yaml
name: Build and Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate search index
        run: npm run generate-search-index

      - name: Build Next.js site
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: ${{ secrets.BASE_PATH || '' }}
          NEXT_PUBLIC_ADSENSE_CLIENT_ID: ${{ secrets.ADSENSE_CLIENT_ID }}

      - name: Export static site
        run: npm run export

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 6. デザインシステム

### カラーパレット
```css
/* Light Theme */
--background: 0 0% 100%;
--foreground: 222 47% 11%;
--primary: 221 83% 53%;        /* 信頼感のあるブルー */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96%;
--accent: 210 40% 96%;
--muted: 210 40% 96%;
--border: 214 32% 91%;

/* Dark Theme */
--background: 222 47% 11%;
--foreground: 210 40% 98%;
--primary: 217 91% 60%;
--secondary: 217 33% 17%;

/* Sepia Theme */
--background: 40 20% 95%;
--foreground: 30 20% 20%;
```

### タイポグラフィ
- **和文**: Noto Sans JP, Hiragino Kaku Gothic ProN, メイリオ, sans-serif
- **縦書き用**: Noto Serif JP, 游明朝, Yu Mincho, serif
- **欧文**: Inter, -apple-system, BlinkMacSystemFont, sans-serif

### レイアウト原則
- **カタログ**: グリッドレイアウト（レスポンシブ: 1-2-3-4列）
- **閲覧**: 最大幅800px、中央寄せで読みやすさ重視
- **余白**: 8pxベースの倍数システム
- **影**: 控えめな影で階層を表現（Google Material準拠）

## 7. SEO・パフォーマンス・アクセシビリティ

### 7.1 SEO対策
- メタタグ最適化（OGP, Twitter Card）
- サイトマップ自動生成
- robots.txt設定
- 構造化データ（JSON-LD: Book, BreadcrumbList）
- 各ページに適切なtitle/description

### 7.2 パフォーマンス目標
- Lighthouse Score 90以上
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s

**最適化手法**:
- 画像の遅延読み込み
- next/imageによる最適化
- コード分割
- フォントの事前読み込み
- Service Worker（オプション: オフライン対応）

### 7.3 アクセシビリティ
- WCAG 2.1 AA準拠
- キーボード操作完全対応
- スクリーンリーダー対応
- 十分なコントラスト比
- フォーカスインジケータ
- ARIAラベル適切な使用

## 8. 多言語対応

### 言語ごとの表示最適化
- 日本語: 縦書き/横書き両対応
- 英語: 横書きのみ
- 中国語: 簡体字/繁体字対応
- その他言語: 基本横書き

### UI言語切り替え
- i18n対応（Next.js国際化機能使用）
- URLベースの言語切り替え

## 9. 分析・監視

- Google Analytics 4統合
- 読書時間トラッキング
- 人気ページ分析
- エラー監視（Sentry等）

## 10. コンテンツ管理フロー

### 書籍追加手順
1. `content/books/YYYY-MM/{id}/{lang}/`にファイル配置
2. metadata.yml作成
3. content.md作成
4. 画像配置
5. Git commit & push
6. GitHub Actions自動ビルド・デプロイ

### 検証項目
- YAMLスキーマバリデーション
- 画像存在チェック
- Markdownリント

## 11. 実装ロードマップ

### Phase 1: MVP（最小限の機能）
1. **プロジェクトセットアップ** (1-2日)
   - Next.js + TypeScript + Tailwind環境構築
   - ディレクトリ構造作成
   - 基本設定ファイル

2. **書籍データローダー** (2-3日)
   - YAMLパーサー
   - Markdownプロセッサー
   - ビルド時データ収集

3. **カタログページ** (3-4日)
   - 書籍一覧表示
   - グリッドレイアウト
   - 基本的な検索機能

4. **閲覧ページ基礎** (4-5日)
   - 横書き表示
   - ページ送り機能
   - 基本UI

5. **LocalStorage統合** (2日)
   - 読書位置保存
   - お気に入り機能

6. **GitHub Actions設定** (1日)
   - ビルド・デプロイパイプライン

### Phase 2: 高度な機能
7. **縦書き対応** (3-4日)
   - CSS実装
   - フォント最適化
   - ページ送りロジック

8. **検索・フィルタ強化** (2-3日)
   - Fuse.js統合
   - タグフィルター
   - ソート機能

9. **設定画面** (2日)
   - 各種設定UI
   - 設定の永続化

10. **AdSense統合** (1-2日)
    - 広告コンポーネント
    - 配置最適化

### Phase 3: UX向上
11. **デザイン洗練** (3-5日)
    - shadcn/ui統合
    - アニメーション
    - レスポンシブ調整

12. **追加機能実装** (5-7日)
    - 目次ナビゲーション
    - ブックマーク
    - ダークモード
    - SNSシェア

13. **パフォーマンス最適化** (2-3日)
    - 画像最適化
    - コード分割
    - キャッシング戦略

14. **SEO・アクセシビリティ** (2-3日)
    - メタタグ最適化
    - 構造化データ
    - WCAG対応

## 12. 将来の拡張性（Phase 4以降）

- ユーザー登録・ログイン（Firebase Auth等）
- コメント機能
- レビュー・評価システム
- 有料書籍対応（Stripe決済）
- 著者管理画面
- EPUB/PDFエクスポート
- 多言語自動翻訳（DeepL API）

## 13. 実装開始前のチェックリスト

### 必要な決定事項
- [ ] ホスティング先（GitHub Pages / Vercel / Cloudflare Pages）
- [ ] ドメイン名
- [ ] Google AdSenseアカウントとクライアントID
- [ ] 初期コンテンツの準備
- [ ] デザインの詳細（ロゴ、ファビコン等）

### 技術的な確認事項
- [ ] Node.js 20+ がインストール済み
- [ ] GitHubリポジトリ作成済み
- [ ] 画像最適化ツールの選定（sharp等）
- [ ] フォントライセンスの確認

---

## ドキュメント管理

- **本ドキュメント**: プロジェクト全体の計画・技術仕様
- **執筆ガイド**: [WRITING_GUIDE.md](./WRITING_GUIDE.md) - 書籍執筆者向けガイド
- **技術仕様書**: TECHNICAL_SPEC.md（詳細な実装仕様）

---

最終更新: 2025-12-03
