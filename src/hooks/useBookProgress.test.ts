import { act, createElement, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBookProgress } from './useBookProgress'

const store = vi.hoisted(() => ({
  getProgress: vi.fn(),
  setProgress: vi.fn(),
}))

vi.mock('next/navigation', () => ({ usePathname: () => '/books/example' }))
vi.mock('@/lib/stores/useReadingStore', () => ({
  useReadingStore: { getState: () => store },
}))

type Options = Parameters<typeof useBookProgress>[0]
type Result = ReturnType<typeof useBookProgress>

let host: HTMLDivElement
let root: Root
let content: HTMLDivElement
let contentRef: RefObject<HTMLDivElement | null>
let smoothRef: RefObject<boolean>
let latest: Result

const rect = (left: number, right: number, top: number, bottom: number): DOMRect => ({
  left,
  right,
  top,
  bottom,
  width: right - left,
  height: bottom - top,
  x: left,
  y: top,
  toJSON: () => ({}),
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  window.history.replaceState({}, '', '/books/example')
  store.getProgress.mockReset().mockReturnValue(null)
  store.setProgress.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  content = document.createElement('div')
  document.body.appendChild(content)
  contentRef = { current: content }
  smoothRef = { current: false }
})

afterEach(async () => {
  await act(async () => root.unmount())
  content.remove()
  host.remove()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mount(overrides: Partial<Options> = {}) {
  const options: Options = {
    bookId: 'book',
    language: 'ja',
    loading: false,
    isPagination: true,
    isVertical: false,
    contentRef,
    isSmoothScrollingRef: smoothRef,
    totalPages: 5,
    onNavigate: vi.fn(),
    onScrollStart: vi.fn(),
    ...overrides,
  }
  function Harness() {
    latest = useBookProgress(options)
    return null
  }
  await act(async () => root.render(createElement(Harness)))
  return options
}

function addPage(index: number, bounds: DOMRect) {
  const page = document.createElement('div')
  page.id = `scroll-page-${index}`
  page.getBoundingClientRect = () => bounds
  content.appendChild(page)
  return page
}

describe('initial reader progress', () => {
  it('uses a valid one-based URL page before saved progress', async () => {
    window.history.replaceState({}, '', '/books/example?page=3')
    store.getProgress.mockReturnValue({ currentPage: 4, scrollPosition: 900 })
    const options = await mount()

    expect(options.onNavigate).toHaveBeenCalledOnce()
    expect(options.onNavigate).toHaveBeenCalledWith(2, 'restore')
  })

  it.each(['0', '6', 'not-a-number'])('falls back to clamped saved progress for invalid page=%s', async page => {
    window.history.replaceState({}, '', `/books/example?page=${page}`)
    store.getProgress.mockReturnValue({ currentPage: 99, scrollPosition: 900 })
    const options = await mount()

    expect(options.onNavigate).toHaveBeenCalledWith(4, 'restore')
  })

  it('falls back to the first page when neither URL nor saved progress is available', async () => {
    const options = await mount()
    expect(options.onNavigate).toHaveBeenCalledWith(0, 'restore')
  })

  it('clamps committed pages and persists the matching book and language', async () => {
    await mount({ loading: true, totalPages: 5 })
    await act(async () => latest.commitPage(-3, 12))
    await act(async () => latest.commitPage(20, 34))

    expect(store.setProgress).toHaveBeenNthCalledWith(1, 'book', 'ja', 0, 12)
    expect(store.setProgress).toHaveBeenNthCalledWith(2, 'book', 'ja', 4, 34)
    expect(latest.currentPage).toBe(4)
  })

  it('persists a committed pagination page and updates the URL without dropping other query parameters', async () => {
    window.history.replaceState({}, '', '/books/example?view=reader&page=1')
    await mount()
    store.setProgress.mockClear()

    await act(async () => latest.commitPage(2))

    expect(store.setProgress).toHaveBeenCalledWith('book', 'ja', 2)
    const params = new URLSearchParams(window.location.search)
    expect(params.get('page')).toBe('3')
    expect(params.get('view')).toBe('reader')
  })

  it('restores a URL page in document scroll mode before removing the URL parameter', async () => {
    window.history.replaceState({}, '', '/books/example?page=2&view=reader')
    addPage(1, rect(0, 800, 400, 800))
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(20)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const options = await mount({ isPagination: false, isVertical: false })

    expect(options.onNavigate).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(100))
    expect(options.onNavigate).toHaveBeenCalledWith(1, 'restore')
    expect(scrollTo).toHaveBeenCalledWith(0, 324)
    expect(store.setProgress).toHaveBeenCalledWith('book', 'ja', 1, 20)
    expect(smoothRef.current).toBe(true)
    await act(async () => vi.advanceTimersByTime(150))
    expect(window.location.search).toBe('?view=reader')
    expect(smoothRef.current).toBe(false)
  })
})

describe('scroll restoration and saving', () => {
  it.each([
    ['vertical', true, -180],
    ['horizontal', false, 240],
  ] as const)('restores the saved %s scroll position while suppressing native saving', async (_name, isVertical, position) => {
    store.getProgress.mockReturnValue({ currentPage: 1, scrollPosition: position })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const options = await mount({ isPagination: false, isVertical })

    if (isVertical) {
      await act(async () => {
        window.dispatchEvent(new CustomEvent('katex-rotation-complete'))
        vi.advanceTimersByTime(50)
      })
      expect(content.scrollLeft).toBe(position)
    } else {
      await act(async () => vi.advanceTimersByTime(100))
      expect(scrollTo).toHaveBeenCalledWith(0, position)
    }
    expect(options.onNavigate).toHaveBeenCalledWith(1, 'restore')
    expect(smoothRef.current).toBe(true)
    await act(async () => vi.advanceTimersByTime(100))
    expect(smoothRef.current).toBe(false)
  })

  it.each([
    ['vertical pagination prose', true, true, 'child'],
    ['vertical scroll container', true, false, 'container'],
    ['horizontal pagination container', false, true, 'container'],
    ['horizontal document', false, false, 'window'],
  ] as const)('listens on the %s surface', async (_name, isVertical, isPagination, targetName) => {
    const child = addPage(1, rect(0, 100, 0, 100))
    content.getBoundingClientRect = () => rect(0, 100, 0, 100)
    Object.defineProperties(content, {
      scrollLeft: { configurable: true, value: -75, writable: true },
      scrollTop: { configurable: true, value: 60, writable: true },
    })
    Object.defineProperties(child, {
      scrollLeft: { configurable: true, value: -45, writable: true },
      scrollTop: { configurable: true, value: 30, writable: true },
    })
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(120)
    const options = await mount({ isVertical, isPagination })
    if (isVertical && !isPagination) {
      await act(async () => {
        window.dispatchEvent(new CustomEvent('katex-rotation-complete'))
        vi.advanceTimersByTime(50)
      })
      content.scrollLeft = -75
    }
    store.setProgress.mockClear()

    const wrongTarget = targetName === 'window' ? content : window
    await act(async () => wrongTarget.dispatchEvent(new Event('scroll')))
    expect(options.onScrollStart).not.toHaveBeenCalled()

    const target = targetName === 'child' ? child : targetName === 'container' ? content : window
    await act(async () => target.dispatchEvent(new Event('scroll')))
    expect(options.onScrollStart).toHaveBeenCalledOnce()

    await act(async () => vi.advanceTimersByTime(500))
    if (isPagination) {
      expect(store.setProgress).not.toHaveBeenCalled()
    } else {
      expect(store.setProgress).toHaveBeenLastCalledWith(
        'book',
        'ja',
        1,
        isVertical ? -75 : 120
      )
    }
  })

  it('debounces settled scroll saving, suppresses programmatic events, and cancels pending work on cleanup', async () => {
    addPage(0, rect(0, 100, 0, 100))
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(70)
    const options = await mount({ isPagination: false, isVertical: false })

    smoothRef.current = true
    await act(async () => window.dispatchEvent(new Event('scroll')))
    expect(options.onScrollStart).not.toHaveBeenCalled()
    expect(store.setProgress).not.toHaveBeenCalled()

    smoothRef.current = false
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(499)
    })
    expect(options.onScrollStart).toHaveBeenCalledOnce()
    expect(store.setProgress).not.toHaveBeenCalled()

    await act(async () => window.dispatchEvent(new Event('scroll')))
    await act(async () => vi.advanceTimersByTime(499))
    expect(store.setProgress).not.toHaveBeenCalled()

    await act(async () => root.unmount())
    await act(async () => vi.advanceTimersByTime(1_000))
    expect(store.setProgress).not.toHaveBeenCalled()
  })
})
