'use client'

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { Book, BookCatalogItem } from '@/types/book'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { markdownToHtml } from '@/lib/books/markdown'
import { generateTableOfContents } from '@/lib/books/toc'
import { useI18n } from '@/lib/i18n'
import TableOfContents from './TableOfContents'
import BookDetailsModal from './BookDetailsModal'
import { speechAnchorAtPoint, speechPositionRect, speechHighlightRect, speechScrollDelta, speechViewport, speechRectIsVisible, firstVisibleSpeechAnchor } from '@/lib/reader/speech/position'
import { buildSpeechPlan } from '@/lib/reader/speech/buildSpeechPlan'
import { normalizeSpeechLanguage, speechLanguagesMatch } from '@/lib/reader/speech/selectVoice'
import { getVisibleReaderPage, resolveReaderScrollTarget } from '@/lib/reader/visiblePage'
import type { SpeechSettings } from '@/lib/reader/speech/types'
import type { SpeechSynthesisPort } from '@/lib/reader/speech/SpeechSynthesisPort'
import type { NavigationSource } from '@/hooks/useSpeechSynthesis'
import type { SpeechControlsProps } from './reader/SpeechControls'
import { ReaderHeader, ReaderContent, PageNavigation, AutoScrollPlayButton } from './reader'
import {
  useBookProgress,
  usePageNavigation,
  useTouchNavigation,
  useMouseNavigation,
  useProgressBar,
  useVerticalLayout,
  useAutoScroll,
  useSpeechSynthesis,
} from '@/hooks'

interface BookReaderProps {
  book: Book
  /** Disable math rendering (debug mode via ?nomath URL parameter) */
  disableMath?: boolean
  /** Disable image rendering (via ?noimage URL parameter) */
  disableImages?: boolean
  /** Explicit port injection for deterministic reader integration tests. */
  speechPort?: SpeechSynthesisPort
}

interface ReaderNavigation {
  token?: string
  direction?: 'next' | 'prev'
  moveViewport?: boolean
  userInteraction?: boolean
  /** Native movement starts now; its debounced position save is independent. */
  positionPending?: boolean
}

export default function BookReader({ book, disableMath = false, disableImages = false, speechPort }: BookReaderProps) {
  const [pageHtml, setPageHtml] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const navigationRef = useRef<(page: number, source: NavigationSource, options?: ReaderNavigation) => void>(() => {})
  const requestNavigation = useCallback((page: number, source: NavigationSource, options?: ReaderNavigation) => {
    navigationRef.current(page, source, options)
  }, [])
  const pendingSpeechNavigation = useRef<{ page: number; token: string } | null>(null)
  const [navigationRevision, setNavigationRevision] = useState(0)
  const speechScrollPosition = useRef<{ element: HTMLElement | Window; position: number } | null>(null)
  const speechScrollAnimation = useRef<{ frame: number; element: HTMLElement | Window; destination: number } | null>(null)
  const cancelSpeechScroll = useCallback(() => {
    if (speechScrollAnimation.current) cancelAnimationFrame(speechScrollAnimation.current.frame)
    speechScrollAnimation.current = null
  }, [])
  const speechGesture = useRef<{ x: number; y: number; target: Element; moved: boolean } | null>(null)
  const scrollReleaseFrame = useRef<number | null>(null)

  // Flag to suppress scroll position saving during programmatic scrolls
  const isSmoothScrollingRef = useRef<boolean>(false)

  // Use selectors to avoid unnecessary re-renders when progress changes
  const settings = useReadingStore((state) => state.settings)
  const { t } = useI18n()

  // Subscribe to the actual data arrays so component re-renders when they change
  const favorites = useReadingStore((state) => state.favorites)
  const allBookmarks = useReadingStore((state) => state.bookmarks)
  const addFavorite = useReadingStore((state) => state.addFavorite)
  const removeFavorite = useReadingStore((state) => state.removeFavorite)
  const addBookmark = useReadingStore((state) => state.addBookmark)
  const removeBookmark = useReadingStore((state) => state.removeBookmark)

  // Calculate derived state - must be before useEffects that depend on them
  const isVertical = settings.writingMode === 'vertical' && book.language === 'ja'
  const isPagination = settings.displayMode === 'pagination'

  // Generate table of contents
  const toc = useMemo(() => generateTableOfContents(book.pages), [book.pages])
  // pageHtml is the semantic source, before ReaderContent's vertical display transforms.
  const speechDocument = useMemo(() => {
    const html: string[] = []
    const pages = typeof DOMParser === 'undefined' ? [] : pageHtml.map((page, index) =>
      buildSpeechPlan(page, index, book.language, annotated => { html.push(annotated) }))
    return { pages, html }
  }, [pageHtml, book.language])
  const speechPages = speechDocument.pages
  const onProgressNavigation = useCallback((page: number, source: 'restore') => {
    requestNavigation(page, source, { moveViewport: false })
  }, [requestNavigation])
  const onNativeScrollStart = useCallback((page: number) => {
    const target = resolveReaderScrollTarget(contentRef.current, isVertical, isPagination)
    const expected = speechScrollPosition.current
    if (target && expected?.element === target.element && Math.abs(expected.position - target.position) < 1) return
    speechScrollPosition.current = null
    requestNavigation(page, 'user', { moveViewport: false, userInteraction: false, positionPending: true })
  }, [requestNavigation, isVertical, isPagination])

  // Book progress hook
  const {
    currentPage,
    commitPage,
    currentPageRef,
  } = useBookProgress({
    bookId: book.id,
    language: book.language,
    loading,
    isPagination,
    isVertical,
    contentRef,
    isSmoothScrollingRef,
    totalPages: book.pages.length,
    onNavigate: onProgressNavigation,
    onScrollStart: onNativeScrollStart,
  })

  const onPositionChange = useCallback(() => {
    requestNavigation(isPagination ? currentPageRef.current : getVisibleReaderPage(contentRef.current, isVertical),
      'user', { moveViewport: false })
  }, [requestNavigation, isPagination, currentPageRef, isVertical])
  const onPositionSettled = useCallback(() => {
    if (!isPagination) commitPage(getVisibleReaderPage(contentRef.current, isVertical),
      isVertical ? contentRef.current?.scrollLeft : window.scrollY)
  }, [commitPage, isPagination, isVertical])
  const onPageNavigate = useCallback((page: number, source: 'user', direction?: 'next' | 'prev') => {
    requestNavigation(page, source, { direction })
  }, [requestNavigation])

  // Page navigation hook
  const { goToNextPage, goToPrevPage, navigationDirectionRef } = usePageNavigation({
    currentPage,
    onNavigate: onPageNavigate,
    onPositionChange,
    totalPages: book.pages.length,
    displayMode: settings.displayMode,
    contentRef,
    isVertical,
  })

  // Touch navigation hook
  const { handleTouchStart, handleTouchMove, handleTouchEnd, touchHandledRef } =
    useTouchNavigation({
      isVertical,
      isPagination,
      contentRef,
      isSmoothScrollingRef,
      onPositionSettled,
      goToNextPage,
      goToPrevPage,
    })

  // Mouse navigation hook
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useMouseNavigation({
    isVertical,
    isPagination,
    contentRef,
    isSmoothScrollingRef,
    onPositionSettled,
    touchHandledRef,
    goToNextPage,
    goToPrevPage,
  })

  // Progress bar hook
  const { progressBarRef, handleProgressBarMouseDown } = useProgressBar({
    totalPages: book.pages.length,
    isVertical,
    loading,
    onNavigate: onPageNavigate,
  })

  // Vertical layout hook
  useVerticalLayout({
    loading,
    isVertical,
    isPagination,
    currentPage,
    contentRef,
    navigationDirectionRef,
  })

  // Auto scroll hook
  const onAutoPageTurn = useCallback(() => {
    requestNavigation(currentPageRef.current + 1, 'user', { direction: 'next', userInteraction: false })
  }, [requestNavigation, currentPageRef])
  const { isPlaying, togglePlayPause, onUserInteraction, stop: stopAutoScroll } = useAutoScroll({
    autoScrollSettings: settings.autoScroll,
    isVertical,
    isPagination,
    contentRef,
    isTocOpen,
    totalPages: book.pages.length,
    currentPage,
    goToNextPage: onAutoPageTurn,
  })

  const speech = useSpeechSynthesis({
    port: speechPort,
    pages: speechPages,
    language: book.language,
    settings: settings.speech,
    contextKey: `${book.id}:${book.language}:${settings.displayMode}:${settings.writingMode}:${disableMath}:${disableImages}`,
    onNavigate: (page, token) => requestNavigation(page, 'speech', { token, direction: 'next' }),
    onPlaybackStart: stopAutoScroll,
    onDefaultVoiceStart: () => {
      const store = useReadingStore.getState()
      store.updateSettings({ speech: { ...store.settings.speech, voiceByLanguage: {
        ...store.settings.speech.voiceByLanguage,
        [book.language]: { mode: 'ua-default', lang: normalizeSpeechLanguage(book.language) },
      } } })
    },
  })

  // This is the only upstream entry for position changes. A user/restore operation
  // invalidates the session synchronously, including a same-tick speech transition.
  useLayoutEffect(() => {
    navigationRef.current = (requestedPage, source, options = {}) => {
      cancelSpeechScroll()
      const page = Math.max(0, Math.min(book.pages.length - 1, requestedPage))
      // Moving the viewport while paused keeps the resumable cursor. Explicit
      // page/TOC/progress navigation still stops the session below.
      if (source === 'user' && options.moveViewport === false && speech.status === 'paused') {
        if (options.userInteraction !== false) onUserInteraction()
        return
      }
      if (!speech.notifyNavigation(page, source, options.token)) return
      pendingSpeechNavigation.current = source === 'speech' && options.token ? { page, token: options.token } : null
      navigationDirectionRef.current = options.direction ?? null
      if (source === 'user' && options.userInteraction !== false) onUserInteraction()
      if (options.positionPending) return
      if (source === 'speech' && isPagination) {
        // Reset the retained surface as part of the speech navigation. Layout's
        // later reset then has no movement to report as a native user scroll.
        isSmoothScrollingRef.current = true
        resolveReaderScrollTarget(contentRef.current, isVertical, true)?.scrollTo(0)
        if (scrollReleaseFrame.current !== null) cancelAnimationFrame(scrollReleaseFrame.current)
        scrollReleaseFrame.current = requestAnimationFrame(() => {
          scrollReleaseFrame.current = null
          isSmoothScrollingRef.current = false
        })
      }
      if (options.moveViewport !== false && !isPagination) {
        const wrapper = contentRef.current?.querySelector<HTMLElement>(`#scroll-page-${page}`)
        if (wrapper) {
          isSmoothScrollingRef.current = true
          if (isVertical && contentRef.current) {
            const container = contentRef.current
            const offset = container.getBoundingClientRect().right - wrapper.getBoundingClientRect().right
            container.scrollTo({ left: container.scrollLeft - offset, behavior: 'instant' })
          } else {
            const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
            window.scrollTo({ top: wrapper.getBoundingClientRect().top + window.scrollY - headerBottom, behavior: 'instant' })
          }
          if (scrollReleaseFrame.current !== null) cancelAnimationFrame(scrollReleaseFrame.current)
          scrollReleaseFrame.current = requestAnimationFrame(() => {
            scrollReleaseFrame.current = null
            isSmoothScrollingRef.current = false
          })
        }
      }
      commitPage(page, isPagination || source === 'restore' ? undefined : isVertical ? contentRef.current?.scrollLeft : window.scrollY)
      setNavigationRevision(revision => revision + 1)
    }
  })

  useEffect(() => {
    if (loading) return
    const pending = pendingSpeechNavigation.current
    if (!pending || pending.page !== currentPage) return
    const frame = requestAnimationFrame(() => {
      if (pendingSpeechNavigation.current !== pending) return
      // The page HTML has committed and ReaderContent's layout work has run.
      pendingSpeechNavigation.current = null
      speech.confirmPage(pending.page, pending.token)
    })
    return () => cancelAnimationFrame(frame)
  }, [loading, currentPage, navigationRevision, speech.confirmPage])

  useEffect(() => () => {
    if (scrollReleaseFrame.current !== null) cancelAnimationFrame(scrollReleaseFrame.current)
  }, [])

  useEffect(() => () => cancelSpeechScroll(), [cancelSpeechScroll])

  useEffect(() => {
    if (speech.status !== 'playing') cancelSpeechScroll()
  }, [speech.status, cancelSpeechScroll])

  useEffect(() => {
    if (speech.status !== 'playing' || loading || !contentRef.current) return
    if (isPagination && speech.cursor.pageIndex !== currentPage) return
    const segment = speechPages[speech.cursor.pageIndex]?.[speech.cursor.segmentIndex]
    const target = resolveReaderScrollTarget(contentRef.current, isVertical, isPagination)
    if (!segment || !target) return
    const highlight = speechHighlightRect(contentRef.current, segment.id)
    if (!highlight) return
    const viewport = speechViewport(target.element)
    // A segment larger than the viewport cannot fit at once; follow the spoken
    // character in that case, rather than oscillating between its two edges.
    const oversized = isVertical ? highlight.width > viewport.right - viewport.left - 32
      : highlight.height > viewport.bottom - viewport.top - 32
    const rect = oversized ? speechPositionRect(contentRef.current, segment.id, speech.charIndex) ?? highlight : highlight
    const delta = speechScrollDelta(rect, viewport, isVertical)
    const destination = Math.max(0, Math.min(target.maxPosition, target.position + delta))
    if (speechScrollAnimation.current?.element === target.element &&
      Math.abs(speechScrollAnimation.current.destination - destination) < 1) return
    cancelSpeechScroll()
    if (Math.abs(destination - target.position) < 1) return
    const start = target.position
    const startedAt = performance.now()
    const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 280
    const animation = { frame: 0, element: target.element, destination }
    const step = (now: number) => {
      if (speechScrollAnimation.current !== animation) return
      const progress = duration ? Math.min(1, (now - startedAt) / duration) : 1
      const eased = 1 - Math.pow(1 - progress, 3)
      target.scrollTo(start + (destination - start) * eased)
      const moved = resolveReaderScrollTarget(contentRef.current, isVertical, isPagination)
      if (moved) speechScrollPosition.current = { element: moved.element, position: moved.position }
      if (progress < 1) animation.frame = requestAnimationFrame(step)
      else speechScrollAnimation.current = null
    }
    speechScrollAnimation.current = animation
    animation.frame = requestAnimationFrame(step)
  }, [speech.status, speech.cursor, speech.charIndex, speechPages, currentPage, loading, isVertical, isPagination, cancelSpeechScroll])

  // ReaderContent may replace its HTML during a render (including vertical
  // transforms), so reapply the non-layout-changing highlight after every commit.
  useLayoutEffect(() => {
    if (speech.status !== 'playing' && speech.status !== 'paused') return
    const segment = speechPages[speech.cursor.pageIndex]?.[speech.cursor.segmentIndex]
    if (!segment) return
    const elements = contentRef.current?.querySelectorAll<HTMLElement>('[data-speech-id="' + segment.id + '"]')
    elements?.forEach(element => { element.dataset.speechActive = 'true' })
    return () => { elements?.forEach(element => { delete element.dataset.speechActive }) }
  })

  const startSpeech = (uaDefault = false) => {
    if (loading) return
    const container = contentRef.current
    const target = resolveReaderScrollTarget(container, isVertical, isPagination)
    const anchor = container && target ? firstVisibleSpeechAnchor(container, speechViewport(target.element)) : null
    const visiblePage = anchor ? speechPages.findIndex(segments => segments.some(segment => segment.id === anchor.id)) : -1
    const page = visiblePage >= 0 ? visiblePage : isPagination ? currentPageRef.current : getVisibleReaderPage(container, isVertical)
    const segmentIndex = anchor ? speechPages[page]?.findIndex(segment => segment.id === anchor.id) ?? -1 : -1
    commitPage(page, isPagination ? undefined : isVertical ? container?.scrollLeft : window.scrollY)
    // Direct user-event invocation preserves browser activation for the first utterance.
    speech.start(page, { uaDefault, cursor: anchor && segmentIndex >= 0 ? { segmentIndex, charIndex: anchor.offset } : undefined })
  }
  const resumeSpeech = () => {
    const container = contentRef.current
    const target = resolveReaderScrollTarget(container, isVertical, isPagination)
    const segment = speechPages[speech.cursor.pageIndex]?.[speech.cursor.segmentIndex]
    if (container && target && segment) {
      const viewport = speechViewport(target.element)
      const current = speechPositionRect(container, segment.id, speech.charIndex)
      if (!current || !speechRectIsVisible(current, viewport)) {
        const anchor = firstVisibleSpeechAnchor(container, viewport)
        if (anchor) {
          const page = speechPages.findIndex(segments => segments.some(item => item.id === anchor.id))
          const index = speechPages[page]?.findIndex(item => item.id === anchor.id) ?? -1
          if (index >= 0) {
            pendingSpeechNavigation.current = null
            commitPage(page, isPagination ? undefined : isVertical ? container.scrollLeft : window.scrollY)
            speech.seek(page, index, anchor.offset)
            return
          }
        }
        // No spoken text is visible (for example, a code-only viewport).
        // Keep the pause instead of pulling the reader back to the old cursor.
        return
      }
    }
    speech.resume()
  }
  const updateSpeechSettings = (patch: Partial<SpeechSettings>) => {
    const store = useReadingStore.getState()
    store.updateSettings({ speech: { ...store.settings.speech, ...patch } })
  }
  const matchingVoices = speech.voices.filter(voice => speechLanguagesMatch(voice.lang, book.language))
  const speechControls: SpeechControlsProps = {
    t, state: speech.status,
    voiceListState: speech.voiceStatus === 'loading' ? 'loading' : speech.voiceStatus === 'unavailable' ? 'unavailable'
      : matchingVoices.length || speech.selection.mode === 'ua-default' ? 'available' : 'no-matching',
    voices: matchingVoices,
    selectedVoiceURI: speech.selection.voice?.voiceURI,
    selectedVoiceMode: speech.selection.mode,
    isFallback: speech.selection.isFallback,
    allowRemoteVoice: settings.speech.allowRemoteVoiceByLanguage[book.language] ?? false,
    rate: settings.speech.rate,
    continueAcrossPages: settings.speech.continueAcrossPages,
    canTryDefaultVoice: speech.voiceStatus === 'unavailable',
    onStart: () => startSpeech(),
    onPause: speech.pause,
    onResume: resumeSpeech,
    onStop: () => speech.stop(currentPageRef.current),
    onRateChange: rate => updateSpeechSettings({ rate }),
    onContinueAcrossPagesChange: continueAcrossPages => updateSpeechSettings({ continueAcrossPages }),
    onRemoteVoiceConsentChange: allowed => updateSpeechSettings({
      allowRemoteVoiceByLanguage: { ...settings.speech.allowRemoteVoiceByLanguage, [book.language]: allowed },
    }),
    onVoiceChange: (voice, mode) => updateSpeechSettings({ voiceByLanguage: {
      ...settings.speech.voiceByLanguage,
      [book.language]: mode === 'listed' && voice ? { mode, voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang, localService: voice.localService }
        : { mode: 'ua-default', lang: normalizeSpeechLanguage(book.language) },
    } }),
    // The controller reports a successful browser start before remembering a trial.
    onTryDefaultVoice: () => startSpeech(true),
  }

  // Determine if play/pause button should be shown
  const showPlayPauseButton = settings.autoScroll?.enabled

  const beginSpeechGesture = (target: EventTarget, x: number, y: number) => {
    if (speech.status !== 'playing' || !(target instanceof Element)) return false
    if (!speechAnchorAtPoint(target, x, y)) return false
    speechGesture.current = { target, x, y, moved: false }
    return true
  }
  const finishSpeechGesture = () => {
    const gesture = speechGesture.current
    speechGesture.current = null
    if (!gesture || gesture.moved) return
    if (window.getSelection()?.toString()) return
    const anchor = speechAnchorAtPoint(gesture.target, gesture.x, gesture.y)
    if (!anchor) return
    const id = anchor.element.dataset.speechId
    const page = speechPages.findIndex(segments => segments.some(segment => segment.id === id))
    const segment = speechPages[page]?.findIndex(segment => segment.id === id) ?? -1
    if (segment < 0) return
    pendingSpeechNavigation.current = null
    commitPage(page)
    speech.seek(page, segment, anchor.offset)
  }
  const moveSpeechGesture = (x: number, y: number) => {
    const gesture = speechGesture.current
    if (gesture && Math.hypot(x - gesture.x, y - gesture.y) > 10) {
      gesture.moved = true
      onPositionChange()
    }
  }
  const wrappedHandleTouchStart = (e: React.TouchEvent) => {
    onUserInteraction()
    if (beginSpeechGesture(e.target, e.touches[0].clientX, e.touches[0].clientY)) return
    onPositionChange()
    handleTouchStart(e)
  }
  const wrappedHandleTouchMove = (e: React.TouchEvent) => {
    if (speechGesture.current) { moveSpeechGesture(e.touches[0].clientX, e.touches[0].clientY); return }
    handleTouchMove(e)
  }
  const wrappedHandleTouchEnd = () => {
    if (speechGesture.current) { touchHandledRef.current = true; finishSpeechGesture(); return }
    handleTouchEnd()
  }
  const wrappedHandleMouseDown = (e: React.MouseEvent) => {
    if (touchHandledRef.current) return
    onUserInteraction()
    if (e.button === 0 && beginSpeechGesture(e.target, e.clientX, e.clientY)) return
    if (e.button === 0) onPositionChange()
    handleMouseDown(e)
  }
  const wrappedHandleMouseMove = (e: React.MouseEvent) => {
    if (speechGesture.current) { moveSpeechGesture(e.clientX, e.clientY); return }
    handleMouseMove(e)
  }
  const wrappedHandleMouseUp = (e: React.MouseEvent) => {
    if (speechGesture.current) { moveSpeechGesture(e.clientX, e.clientY); finishSpeechGesture(); return }
    handleMouseUp(e)
  }

  useEffect(() => {
    setMounted(true)

    // Prevent browser back/forward navigation gestures (swipe left/right) on reader page only
    const html = document.documentElement
    const originalOverscrollBehaviorX = html.style.overscrollBehaviorX
    html.style.overscrollBehaviorX = 'none'

    return () => {
      html.style.overscrollBehaviorX = originalOverscrollBehaviorX
    }
  }, [])

  // Convert all pages to HTML with image path fixes
  useEffect(() => {
    let active = true
    setLoading(true)
    const convertPages = async () => {
      const htmlPages = await Promise.all(
        book.pages.map((page) => markdownToHtml(page, {
          bookFolderPath: book.folderPath,
          disableMath,
          disableImages,
        }))
      )
      if (active) {
        setPageHtml(htmlPages)
        setLoading(false)
      }
    }

    convertPages()
    return () => { active = false }
  }, [book, disableMath, disableImages])

  // Calculate derived state for mounted-dependent values
  // Compute from the actual arrays so changes trigger re-renders
  const favorite = mounted
    ? favorites.some((f) => f.bookId === book.id && f.language === book.language)
    : false
  const isBookmarked = mounted
    ? allBookmarks.some(
        (b) => b.bookId === book.id && b.language === book.language && b.pageIndex === currentPage
      )
    : false
  const bookmarks = mounted
    ? allBookmarks
        .filter((b) => b.bookId === book.id && b.language === book.language)
        .sort((a, b) => a.pageIndex - b.pageIndex)
    : []

  const toggleFavorite = () => {
    if (mounted) {
      if (favorite) {
        removeFavorite(book.id, book.language)
      } else {
        addFavorite(book.id, book.language)
      }
    }
  }

  const toggleBookmark = () => {
    if (mounted) {
      if (isBookmarked) {
        removeBookmark(book.id, book.language, currentPage)
      } else {
        addBookmark(book.id, book.language, currentPage)
      }
    }
  }

  // Convert Book to BookCatalogItem for the modal
  const bookCatalogItem: BookCatalogItem = {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    description: book.description,
    summary: book.summary,
    tags: book.tags,
    language: book.language,
    publishDate: book.publishDate,
    coverImage: book.coverImage,
    donationLink: book.donationLink,
    purchaseLink: book.purchaseLink,
    aiUsage: book.aiUsage,
    folderPath: book.folderPath,
  }

  const handleTitleClick = () => {
    setIsDetailsModalOpen(true)
  }

  // Handle page change from Table of Contents
  const handleTocPageChange = (pageIndex: number) => {
    requestNavigation(pageIndex, 'user')
  }

  // Get theme-specific classes
  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'sepia':
        return 'bg-amber-50 text-amber-900'
      case 'dark':
        return 'bg-slate-900 text-gray-100'
      case 'light':
        return 'bg-white text-gray-900'
      default: // 'auto'
        return 'bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100'
    }
  }

  // Calculate brightness overlay opacity (inverted: 100% = no overlay, 30% = dark overlay)
  const brightnessOverlayOpacity = (100 - (settings.brightness ?? 100)) / 100

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">{t.reader.loadingBook}</p>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${getThemeClasses()}`}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Table of Contents - available in both pagination and scroll modes */}
      <TableOfContents
        toc={toc}
        currentPage={currentPage}
        onPageChange={handleTocPageChange}
        bookmarks={bookmarks}
        isOpen={isTocOpen}
        onToggle={() => setIsTocOpen(!isTocOpen)}
        isScrollMode={!isPagination}
        bookId={book.id}
        language={book.language}
      />

      {/* Header */}
      <ReaderHeader
        book={book}
        toc={toc}
        bookmarks={bookmarks}
        isTocOpen={isTocOpen}
        setIsTocOpen={setIsTocOpen}
        favorite={favorite}
        toggleFavorite={toggleFavorite}
        isBookmarked={isBookmarked}
        toggleBookmark={toggleBookmark}
        isPagination={isPagination}
        currentPage={currentPage}
        t={t}
        onTitleClick={handleTitleClick}
        speechControls={speechControls}
        onLeave={() => speech.stop(currentPageRef.current)}
      />

      {/* Reader Content */}
      <main className={`flex-1 ${isPagination ? 'overflow-hidden' : ''}`} onWheel={onPositionChange}>
        <ReaderContent
          pageHtml={speechDocument.html}
          currentPage={currentPage}
          isVertical={isVertical}
          isPagination={isPagination}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          contentLanguage={book.language}
          lineHeight={settings.lineHeight ?? 1.8}
          marginSize={settings.marginSize ?? 'medium'}
          theme={settings.theme}
          contentRef={contentRef}
          handleTouchStart={wrappedHandleTouchStart}
          handleTouchMove={wrappedHandleTouchMove}
          handleTouchEnd={wrappedHandleTouchEnd}
          handleMouseDown={wrappedHandleMouseDown}
          handleMouseMove={wrappedHandleMouseMove}
          handleMouseUp={wrappedHandleMouseUp}
          donationLink={book.donationLink}
          donateLabel={t.reader.donateToAuthor}
          purchaseLink={book.purchaseLink}
          purchaseLabel={t.reader.purchaseBook}
        />
      </main>

      {/* Fixed Page Navigation (Pagination Mode Only) */}
      {isPagination && (
        <PageNavigation
          currentPage={currentPage}
          totalPages={book.pages.length}
          isVertical={isVertical}
          progressBarRef={progressBarRef}
          goToNextPage={goToNextPage}
          goToPrevPage={goToPrevPage}
          handleProgressBarMouseDown={handleProgressBarMouseDown}
          onPageIndicatorClick={() => setIsTocOpen(true)}
          t={t}
        />
      )}

      {/* Book Details Modal */}
      <BookDetailsModal
        book={bookCatalogItem}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />

      {/* Auto Scroll Play/Pause Button */}
      {showPlayPauseButton && (
        <AutoScrollPlayButton isPlaying={isPlaying} onToggle={() => { onPositionChange(); togglePlayPause() }} />
      )}

      {/* Brightness Overlay */}
      {brightnessOverlayOpacity > 0 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-50"
          style={{ opacity: brightnessOverlayOpacity }}
        />
      )}
    </div>
  )
}
