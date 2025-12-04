// Translation keys and messages for all supported languages
// Add new languages by extending the translations object

export const SUPPORTED_LANGUAGES = ['en', 'ja'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  ja: '日本語',
}

// Translation keys structure - add new keys here
export interface TranslationMessages {
  // Common
  common: {
    home: string
    back: string
    settings: string
    loading: string
  }
  // Home page
  home: {
    title: string
    subtitle: string
    description: string
    browseCatalog: string
    features: {
      freeBooks: {
        title: string
        description: string
      }
      saveProgress: {
        title: string
        description: string
      }
      customizable: {
        title: string
        description: string
      }
    }
  }
  // Catalog page
  catalog: {
    title: string
    allBooks: string
    favorites: string
    recentlyRead: string
    noBooks: string
    noBooksYet: string
    searchPlaceholder: string
    filterByTags: string
    showLess: string
    moreCount: string
    clearFilters: string
    progress: string
    reading: string
  }
  // Settings page
  settings: {
    title: string
    displaySettings: string
    writingMode: {
      label: string
      horizontal: string
      vertical: string
      note: string
    }
    displayMode: {
      label: string
      pagination: string
      scroll: string
    }
    fontSize: {
      label: string
      small: string
      large: string
    }
    theme: {
      label: string
      auto: string
      light: string
      dark: string
      note: string
    }
    fontFamily: {
      label: string
      system: string
      serif: string
      sansSerif: string
      mincho: string
      gothic: string
      note: string
    }
    language: {
      label: string
      note: string
    }
    dataManagement: {
      title: string
      export: string
      import: string
      cancelImport: string
      importPlaceholder: string
      importSuccess: string
      importError: string
      note: string
    }
  }
  // Book reader
  reader: {
    tableOfContents: string
    bookmarks: string
    toc: string
    page: string
    addBookmark: string
    removeBookmark: string
    share: string
    shareText: string
    loadingBook: string
    catalog: string
    tweet: string
    prev: string
    next: string
  }
}

// English translations
const en: TranslationMessages = {
  common: {
    home: 'Home',
    back: 'Back',
    settings: 'Settings',
    loading: 'Loading...',
  },
  home: {
    title: 'DeusLibri',
    subtitle: 'Your free digital library',
    description:
      'Read books online for free. Browse our catalog, save your favorites, and pick up where you left off.',
    browseCatalog: 'Browse Catalog',
    features: {
      freeBooks: {
        title: 'Free Books',
        description: 'Access a growing collection of books completely free',
      },
      saveProgress: {
        title: 'Save Progress',
        description: 'Your reading progress is saved automatically',
      },
      customizable: {
        title: 'Customizable',
        description: 'Adjust font size, reading mode, and more',
      },
    },
  },
  catalog: {
    title: 'Book Catalog',
    allBooks: 'All Books',
    favorites: 'Favorites',
    recentlyRead: 'Recently Read',
    noBooks: 'No books found',
    noBooksYet: 'No books available yet. Add books to the content/books folder.',
    searchPlaceholder: 'Search books...',
    filterByTags: 'Filter by tags:',
    showLess: 'Show less',
    moreCount: 'more',
    clearFilters: 'Clear all filters',
    progress: 'Progress',
    reading: 'Reading',
  },
  settings: {
    title: 'Settings',
    displaySettings: 'Display Settings',
    writingMode: {
      label: 'Writing Mode (Japanese only)',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      note: 'Vertical mode only works with Japanese text',
    },
    displayMode: {
      label: 'Display Mode',
      pagination: 'Pagination (Page by page)',
      scroll: 'Infinite Scroll',
    },
    fontSize: {
      label: 'Font Size',
      small: 'Small (12px)',
      large: 'Large (32px)',
    },
    theme: {
      label: 'Theme',
      auto: 'Auto (System)',
      light: 'Light',
      dark: 'Dark',
      note: 'Auto mode follows your system preference',
    },
    fontFamily: {
      label: 'Font Family',
      system: 'System Default',
      serif: 'Serif (Times, Georgia)',
      sansSerif: 'Sans-serif (Arial, Helvetica)',
      mincho: 'Mincho (Japanese Serif)',
      gothic: 'Gothic (Japanese Sans-serif)',
      note: 'Mincho and Gothic are optimized for Japanese text',
    },
    language: {
      label: 'Language',
      note: 'Select your preferred UI language',
    },
    dataManagement: {
      title: 'Data Management',
      export: 'Export Reading Data',
      import: 'Import Reading Data',
      cancelImport: 'Cancel Import',
      importPlaceholder: 'Paste your exported data here...',
      importSuccess: 'Data imported successfully!',
      importError: 'Failed to import data. Please check the format.',
      note: 'Export your reading progress, favorites, and settings to backup or transfer to another device.',
    },
  },
  reader: {
    tableOfContents: 'Table of Contents',
    bookmarks: 'Bookmarks',
    toc: 'TOC',
    page: 'Page',
    addBookmark: 'Add Bookmark',
    removeBookmark: 'Remove Bookmark',
    share: 'Share',
    shareText: 'Check out this book:',
    loadingBook: 'Loading book...',
    catalog: 'Catalog',
    tweet: 'Tweet',
    prev: 'Prev',
    next: 'Next',
  },
}

// Japanese translations
const ja: TranslationMessages = {
  common: {
    home: 'ホーム',
    back: '戻る',
    settings: '設定',
    loading: '読み込み中...',
  },
  home: {
    title: 'DeusLibri',
    subtitle: '無料のデジタルライブラリ',
    description:
      '無料でオンライン読書を楽しめます。カタログを閲覧し、お気に入りを保存して、いつでも続きから読むことができます。',
    browseCatalog: 'カタログを見る',
    features: {
      freeBooks: {
        title: '無料の書籍',
        description: '増え続ける書籍コレクションに無料でアクセス',
      },
      saveProgress: {
        title: '進捗の保存',
        description: '読書の進捗は自動的に保存されます',
      },
      customizable: {
        title: 'カスタマイズ可能',
        description: 'フォントサイズ、読書モードなどを調整',
      },
    },
  },
  catalog: {
    title: '書籍カタログ',
    allBooks: 'すべての本',
    favorites: 'お気に入り',
    recentlyRead: '最近読んだ本',
    noBooks: '書籍が見つかりません',
    noBooksYet: 'まだ書籍がありません。content/booksフォルダに書籍を追加してください。',
    searchPlaceholder: '書籍を検索...',
    filterByTags: 'タグで絞り込み：',
    showLess: '表示を減らす',
    moreCount: '件以上',
    clearFilters: 'フィルターをクリア',
    progress: '進捗',
    reading: '読書中',
  },
  settings: {
    title: '設定',
    displaySettings: '表示設定',
    writingMode: {
      label: '文字の方向（日本語のみ）',
      horizontal: '横書き',
      vertical: '縦書き',
      note: '縦書きモードは日本語テキストでのみ機能します',
    },
    displayMode: {
      label: '表示モード',
      pagination: 'ページ送り（ページごと）',
      scroll: '無限スクロール',
    },
    fontSize: {
      label: 'フォントサイズ',
      small: '小 (12px)',
      large: '大 (32px)',
    },
    theme: {
      label: 'テーマ',
      auto: '自動（システム設定）',
      light: 'ライト',
      dark: 'ダーク',
      note: '自動モードはシステム設定に従います',
    },
    fontFamily: {
      label: 'フォント',
      system: 'システムデフォルト',
      serif: 'セリフ体 (Times, Georgia)',
      sansSerif: 'サンセリフ体 (Arial, Helvetica)',
      mincho: '明朝体',
      gothic: 'ゴシック体',
      note: '明朝体とゴシック体は日本語テキストに最適化されています',
    },
    language: {
      label: '言語',
      note: 'お好みのUI言語を選択してください',
    },
    dataManagement: {
      title: 'データ管理',
      export: '読書データをエクスポート',
      import: '読書データをインポート',
      cancelImport: 'インポートをキャンセル',
      importPlaceholder: 'エクスポートしたデータをここに貼り付けてください...',
      importSuccess: 'データのインポートに成功しました！',
      importError: 'データのインポートに失敗しました。形式を確認してください。',
      note: '読書の進捗、お気に入り、設定をエクスポートして、バックアップしたり、他のデバイスに転送できます。',
    },
  },
  reader: {
    tableOfContents: '目次',
    bookmarks: 'ブックマーク',
    toc: '目次',
    page: 'ページ',
    addBookmark: 'ブックマークを追加',
    removeBookmark: 'ブックマークを削除',
    share: '共有',
    shareText: 'この本をチェック：',
    loadingBook: '書籍を読み込み中...',
    catalog: 'カタログ',
    tweet: 'ツイート',
    prev: '前へ',
    next: '次へ',
  },
}

// All translations
export const translations: Record<SupportedLanguage, TranslationMessages> = {
  en,
  ja,
}

// Helper function to get translation
export function getTranslation(language: SupportedLanguage): TranslationMessages {
  return translations[language] || translations.en
}

// Helper function to detect browser language
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en'

  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage
  }
  return 'en'
}
