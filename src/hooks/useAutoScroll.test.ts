import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useAutoScroll } from './useAutoScroll'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
  'moves the actual scroll surface and finishes at its end vertical=%s pagination=%s', async (isVertical, isPagination) => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const content = document.createElement('div')
    const prose = document.createElement('div')
    content.appendChild(prose)
    const contentRef = { current: content }
    const next = vi.fn()
    const metrics = (element: Element, width: number, height: number) => {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 100 }, scrollWidth: { configurable: true, value: width },
        clientHeight: { configurable: true, value: 100 }, scrollHeight: { configurable: true, value: height },
      })
    }
    metrics(content, isVertical ? 160 : 100, isVertical ? 100 : 160)
    metrics(prose, isVertical ? 160 : 100, 100)
    const target = isVertical && isPagination ? prose : content
    let position = 0
    let windowY = 0
    Object.defineProperty(target, isVertical ? 'scrollLeft' : 'scrollTop', {
      configurable: true, get: () => isVertical ? -position : position,
      set: (value: number) => { position = Math.max(0, Math.min(60, isVertical ? -value : value)) },
    })
    for (const element of [content, prose]) {
      element.scrollTo = vi.fn((options: ScrollToOptions | number) => {
        if (typeof options !== 'number') {
          if (options.left !== undefined) element.scrollLeft = options.left
          if (options.top !== undefined) element.scrollTop = options.top
        }
      }) as typeof element.scrollTo
    }
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => windowY)
    vi.stubGlobal('innerHeight', 100)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(document.body, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
      windowY = Math.max(0, Math.min(60, typeof options === 'number' ? y ?? 0 : options.top ?? windowY))
    })
    function Harness({ page }: { page: number }) {
      useAutoScroll({ autoScrollSettings: { enabled: true, speed: 100, startDelay: 0,
        autoPageTurn: true, autoPageTurnDelay: 50, userInteractionBehavior: 'pause' },
        isVertical, isPagination, contentRef, isTocOpen: false, totalPages: 2, currentPage: page, goToNextPage: next })
      return null
    }
    try {
      await act(async () => root.render(createElement(Harness, { page: 0 })))
      await act(async () => vi.advanceTimersByTime(300))
      expect(isVertical || isPagination ? position : windowY).toBe(60)
      expect(next).toHaveBeenCalledTimes(isPagination ? 1 : 0)
      expect(vi.getTimerCount()).toBe(0)
      if (isPagination) {
        position = 0
        await act(async () => root.render(createElement(Harness, { page: 1 })))
        await act(async () => vi.advanceTimersByTime(300))
        expect(position).toBe(60)
        expect(next).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
      }
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })

it('external stop synchronously clears every timer and waits for explicit play across page changes', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const content = document.createElement('div')
  const contentRef = { current: content }
  const next = vi.fn()
  let playback!: ReturnType<typeof useAutoScroll>
  function Harness({ page }: { page: number }) {
    playback = useAutoScroll({ autoScrollSettings: { enabled: true, speed: 50, startDelay: 500,
      autoPageTurn: true, autoPageTurnDelay: 1000, userInteractionBehavior: 'autoResume' },
      isVertical: false, isPagination: true, contentRef, isTocOpen: false, totalPages: 4, currentPage: page, goToNextPage: next })
    return null
  }
  try {
    await act(async () => root.render(createElement(Harness, { page: 0 })))
    expect(playback.isPlaying).toBe(true)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    await act(async () => { playback.stop(); expect(vi.getTimerCount()).toBe(0) })
    await act(async () => root.render(createElement(Harness, { page: 1 })))
    await act(async () => { playback.onUserInteraction(); vi.advanceTimersByTime(10000) })
    expect(playback.isPlaying).toBe(false)
    expect(next).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => playback.togglePlayPause())
    expect(playback.isPlaying).toBe(true)
    await act(async () => vi.advanceTimersByTime(700))
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    await act(async () => { playback.stop(); expect(vi.getTimerCount()).toBe(0) })
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
