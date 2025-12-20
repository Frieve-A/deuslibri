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
    catalog: string
    about: string
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
      sepia: string
      note: string
    }
    lineHeight: {
      label: string
      compact: string
      spacious: string
    }
    marginSize: {
      label: string
      small: string
      medium: string
      large: string
    }
    brightness: {
      label: string
      dim: string
      bright: string
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
    autoScroll: {
      title: string
      enabled: string
      enabledNote: string
      speed: {
        label: string
        slow: string
        fast: string
      }
      startDelay: {
        label: string
        short: string
        long: string
      }
      autoPageTurn: string
      autoPageTurnNote: string
      autoPageTurnDelay: {
        label: string
        short: string
        long: string
      }
      userInteractionBehavior: {
        label: string
        pause: string
        autoResume: string
      }
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
    shareThisBook: string
    shareThisPage: string
    loadingBook: string
    catalog: string
    tweet: string
    prev: string
    next: string
  }
  // Book details modal
  bookDetails: {
    title: string
    details: string
    author: string
    description: string
    summary: string
    tags: string
    language: string
    publishDate: string
    close: string
    readBook: string
  }
  // Help / Controls
  help: {
    title: string
    button: string
    close: string
    sections: {
      pagination: {
        title: string
        horizontal: {
          title: string
          items: string[]
        }
        vertical: {
          title: string
          items: string[]
        }
      }
      scroll: {
        title: string
        horizontal: {
          title: string
          items: string[]
        }
        vertical: {
          title: string
          items: string[]
        }
      }
      common: {
        title: string
        items: string[]
      }
    }
  }
  // About page
  about: {
    title: string
    description: string
    features: {
      title: string
      items: string[]
    }
    operator: string
    operatorName: string
    contact: string
    version: string
  }
}

// English translations
const en: TranslationMessages = {
  common: {
    home: 'Home',
    back: 'Back',
    settings: 'Settings',
    loading: 'Loading...',
    catalog: 'Catalog',
    about: 'About',
  },
  home: {
    title: 'DeusLibri',
    subtitle: 'Your free digital library',
    description:
      'Read books online for free. Browse our catalog, save your favorites, and pick up where you left off.',
    browseCatalog: 'Browse Catalog',
    features: {
      freeBooks: {
        title: 'Free Original Books',
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
      sepia: 'Sepia',
      note: 'Auto mode follows your system preference',
    },
    lineHeight: {
      label: 'Line Height',
      compact: 'Compact',
      spacious: 'Spacious',
    },
    marginSize: {
      label: 'Margin Size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
    },
    brightness: {
      label: 'Brightness',
      dim: 'Dim',
      bright: 'Bright',
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
    autoScroll: {
      title: 'Auto Scroll',
      enabled: 'Enable Auto Scroll',
      enabledNote: 'Enable to configure all auto scroll settings below',
      speed: {
        label: 'Scroll Speed',
        slow: 'Slow',
        fast: 'Fast',
      },
      startDelay: {
        label: 'Start Delay',
        short: '0s',
        long: '10s',
      },
      autoPageTurn: 'Auto Page Turn',
      autoPageTurnNote: 'Only available in pagination mode',
      autoPageTurnDelay: {
        label: 'Page Turn Delay',
        short: '1s',
        long: '30s',
      },
      userInteractionBehavior: {
        label: 'On User Interaction',
        pause: 'Pause',
        autoResume: 'Auto Resume',
      },
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
    shareThisBook: 'Share this book',
    shareThisPage: 'Share this page',
    loadingBook: 'Loading book...',
    catalog: 'Catalog',
    tweet: 'Tweet',
    prev: 'Prev',
    next: 'Next',
  },
  bookDetails: {
    title: 'Book Details',
    details: 'Details',
    author: 'Author',
    description: 'Description',
    summary: 'Summary',
    tags: 'Tags',
    language: 'Language',
    publishDate: 'Published',
    close: 'Close',
    readBook: 'Read Book',
  },
  help: {
    title: 'Controls',
    button: 'Help',
    close: 'Close',
    sections: {
      pagination: {
        title: 'Pagination Mode',
        horizontal: {
          title: 'Horizontal Writing',
          items: [
            'Left/Right edge tap/click: Previous/Next page',
            'Left/Right swipe: Previous/Next page',
            'Top/Bottom tap/click (center): Scroll up/down within page',
            'Up/Down swipe at edge: Previous/Next page',
          ],
        },
        vertical: {
          title: 'Vertical Writing (Japanese)',
          items: [
            'Left/Right tap/click: Scroll within page / Next/Previous page',
            'Left/Right swipe at edge: Next/Previous page',
          ],
        },
      },
      scroll: {
        title: 'Scroll Mode',
        horizontal: {
          title: 'Horizontal Writing',
          items: [
            'Top/Bottom tap/click: Scroll up/down',
            'Normal vertical scrolling',
          ],
        },
        vertical: {
          title: 'Vertical Writing (Japanese)',
          items: [
            'Left/Right tap/click: Scroll left/right',
            'Normal horizontal scrolling',
          ],
        },
      },
      common: {
        title: 'Common',
        items: [
          'Long press: Text selection',
          'Drag: Text selection',
          'TOC button: Open table of contents',
          'Page indicator click: Open table of contents',
        ],
      },
    },
  },
  about: {
    title: 'About This Site',
    description:
      'DeusLibri is a site operated by Frieve that publishes the best original books for free. More books will be added regularly.',
    features: {
      title: 'Useful Features',
      items: [
        'Vertical and horizontal writing mode support (Japanese)',
        'Pagination and infinite scroll modes',
        'Customizable font size, line height, and margins',
        'Dark mode and sepia theme support',
        'Auto-save reading progress',
        'Bookmark and table of contents',
        'Auto-scroll feature for hands-free reading',
      ],
    },
    operator: 'Operated by',
    operatorName: 'Frieve',
    contact: 'Contact Form',
    version: 'Version',
  },
}

// Japanese translations
const ja: TranslationMessages = {
  common: {
    home: 'ホーム',
    back: '戻る',
    settings: '設定',
    loading: '読み込み中...',
    catalog: 'カタログ',
    about: '当サイトについて',
  },
  home: {
    title: 'DeusLibri',
    subtitle: '無料のデジタルライブラリ',
    description:
      '無料でオンライン読書を楽しめます。カタログを閲覧し、お気に入りを保存して、いつでも続きから読むことができます。',
    browseCatalog: 'カタログを見る',
    features: {
      freeBooks: {
        title: '無料のオリジナル書籍',
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
      sepia: 'セピア',
      note: '自動モードはシステム設定に従います',
    },
    lineHeight: {
      label: '行間',
      compact: '狭い',
      spacious: '広い',
    },
    marginSize: {
      label: '余白',
      small: '小',
      medium: '中',
      large: '大',
    },
    brightness: {
      label: '明るさ',
      dim: '暗い',
      bright: '明るい',
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
    autoScroll: {
      title: '自動スクロール',
      enabled: '自動スクロールを有効にする',
      enabledNote: '有効にすると以下のすべての設定が変更可能になります',
      speed: {
        label: 'スクロール速度',
        slow: '遅い',
        fast: '速い',
      },
      startDelay: {
        label: 'スクロール開始までのディレイ',
        short: '0秒',
        long: '10秒',
      },
      autoPageTurn: '自動ページ送り',
      autoPageTurnNote: 'ページ送りモードでのみ設定可能',
      autoPageTurnDelay: {
        label: '自動ページ送り時間',
        short: '1秒',
        long: '30秒',
      },
      userInteractionBehavior: {
        label: 'ユーザ操作時の挙動',
        pause: '一時停止',
        autoResume: '自動再開',
      },
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
    shareThisBook: 'この本をシェア',
    shareThisPage: 'このページをシェア',
    loadingBook: '書籍を読み込み中...',
    catalog: 'カタログ',
    tweet: 'ツイート',
    prev: '前へ',
    next: '次へ',
  },
  bookDetails: {
    title: '書籍詳細',
    details: '詳細',
    author: '著者',
    description: '説明',
    summary: '概要',
    tags: 'タグ',
    language: '言語',
    publishDate: '出版日',
    close: '閉じる',
    readBook: '読む',
  },
  help: {
    title: '操作方法',
    button: 'ヘルプ',
    close: '閉じる',
    sections: {
      pagination: {
        title: 'ページ送りモード',
        horizontal: {
          title: '横書き',
          items: [
            '左右端タップ/クリック：前/次のページ',
            '左右スワイプ：前/次のページ',
            '上下タップ/クリック（中央部）：ページ内スクロール',
            '端で上下スワイプ：前/次のページ',
          ],
        },
        vertical: {
          title: '縦書き（日本語）',
          items: [
            '左右タップ/クリック：ページ内スクロール / 次/前のページ',
            '端で左右スワイプ：次/前のページ',
          ],
        },
      },
      scroll: {
        title: 'スクロールモード',
        horizontal: {
          title: '横書き',
          items: [
            '上下タップ/クリック：上下にスクロール',
            '通常の縦スクロール',
          ],
        },
        vertical: {
          title: '縦書き（日本語）',
          items: [
            '左右タップ/クリック：左右にスクロール',
            '通常の横スクロール',
          ],
        },
      },
      common: {
        title: '共通',
        items: [
          '長押し：テキスト選択',
          'ドラッグ：テキスト選択',
          '目次ボタン：目次を開く',
          'ページ番号クリック：目次を開く',
        ],
      },
    },
  },
  about: {
    title: '当サイトについて',
    description:
      'DeusLibriはFrieveの運営する、最高のオリジナル書籍を無料で公開するサイトです。書籍は今後も随時追加予定です。',
    features: {
      title: 'サイトの便利な機能',
      items: [
        'ページ送りと無限スクロールモード',
        'フォントサイズ、行間、余白のカスタマイズ',
        'ダークモードとセピアテーマ対応',
        '読書進捗の自動保存',
        'ブックマークと目次機能',
        'ハンズフリー読書のための自動スクロール機能',
        '縦書き・横書きモード対応(日本語)',
      ],
    },
    operator: '運営',
    operatorName: 'Frieve',
    contact: 'お問い合わせフォーム',
    version: 'バージョン',
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
