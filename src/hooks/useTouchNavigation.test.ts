import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { useTouchNavigation } from './useTouchNavigation'

const initialSettings = useReadingStore.getState().settings

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  useReadingStore.setState({ settings: initialSettings })
})

function prepare(element: HTMLElement, width: number, height: number) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: 100 }, scrollWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: 100 }, scrollHeight: { configurable: true, value: height },
  })
  element.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} })
  element.scrollTo = vi.fn((options: ScrollToOptions) => {
    if (options.left !== undefined) element.scrollLeft = options.left
    if (options.top !== undefined) element.scrollTop = options.top
  }) as typeof element.scrollTo
  element.scrollBy = vi.fn((options: ScrollToOptions) => {
    element.scrollLeft += options.left ?? 0
    element.scrollTop += options.top ?? 0
  }) as typeof element.scrollBy
}

const touch = (target: EventTarget, x: number, y: number) => ({
  target, touches: [{ clientX: x, clientY: y }],
}) as unknown as React.TouchEvent

async function mount(vertical: boolean, pagination: boolean) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const content = document.createElement('div')
  const prose = document.createElement('div')
  const target = document.createElement('span')
  prose.appendChild(target)
  content.appendChild(prose)
  prepare(content, 100, 400)
  prepare(prose, 400, 100)
  const smooth = { current: false }
  const settled = vi.fn()
  const next = vi.fn()
  const prev = vi.fn()
  let api!: ReturnType<typeof useTouchNavigation>
  function Harness() {
    api = useTouchNavigation({ isVertical: vertical, isPagination: pagination, contentRef: { current: content },
      isSmoothScrollingRef: smooth, onPositionSettled: settled, goToNextPage: next, goToPrevPage: prev })
    return null
  }
  await act(async () => root.render(createElement(Harness)))
  return { api: () => api, content, prose, target, smooth, settled, next, prev, cleanup: async () => {
    await act(async () => root.unmount())
    host.remove()
  } }
}

async function tap(mounted: Awaited<ReturnType<typeof mount>>, x: number, y: number, target: EventTarget = mounted.target) {
  await act(async () => {
    mounted.api().handleTouchStart(touch(target, x, y))
    mounted.api().handleTouchEnd()
  })
}

async function swipe(mounted: Awaited<ReturnType<typeof mount>>, start: [number, number], end: [number, number], target: EventTarget = mounted.target) {
  await act(async () => {
    mounted.api().handleTouchStart(touch(target, ...start))
    mounted.api().handleTouchMove(touch(target, ...end))
    mounted.api().handleTouchEnd()
  })
}

it('scrolls vertical pagination on taps and turns at its reading edges', async () => {
  const mounted = await mount(true, true)
  try {
    mounted.prose.scrollLeft = -100
    await tap(mounted, 25, 50)
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -180, behavior: 'smooth' })
    mounted.prose.scrollLeft = -100
    await tap(mounted, 75, 50)
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -20, behavior: 'smooth' })
    mounted.prose.scrollLeft = -300
    await tap(mounted, 25, 50)
    expect(mounted.next).toHaveBeenCalledTimes(1)
    mounted.prose.scrollLeft = 0
    await tap(mounted, 75, 50)
    expect(mounted.prev).toHaveBeenCalledTimes(1)
    expect(mounted.api().touchHandledRef.current).toBe(true)
  } finally {
    await mounted.cleanup()
  }
})

it('gates touch tap scrolling and page turns independently', async () => {
  useReadingStore.getState().updateSettings({ interaction: { ...initialSettings.interaction,
    enableTapScroll: false, enableTapPageTurn: true } })
  const pageOnly = await mount(true, true)
  try {
    pageOnly.prose.scrollLeft = -100
    await tap(pageOnly, 25, 50)
    expect(pageOnly.prose.scrollTo).not.toHaveBeenCalled()
    pageOnly.prose.scrollLeft = -300
    await tap(pageOnly, 25, 50)
    expect(pageOnly.next).toHaveBeenCalledTimes(1)
  } finally {
    await pageOnly.cleanup()
  }

  useReadingStore.getState().updateSettings({ interaction: { ...initialSettings.interaction,
    enableTapScroll: true, enableTapPageTurn: false } })
  const scrollOnly = await mount(true, true)
  try {
    scrollOnly.prose.scrollLeft = -100
    await tap(scrollOnly, 25, 50)
    expect(scrollOnly.prose.scrollTo).toHaveBeenCalledWith({ left: -180, behavior: 'smooth' })
    scrollOnly.prose.scrollLeft = -300
    await tap(scrollOnly, 25, 50)
    expect(scrollOnly.next).not.toHaveBeenCalled()
  } finally {
    await scrollOnly.cleanup()
  }
})

it('disables touch flick page turns without disabling tap page turns', async () => {
  useReadingStore.getState().updateSettings({ interaction: { ...initialSettings.interaction,
    enableFlickPageTurn: false } })
  const mounted = await mount(true, true)
  try {
    mounted.prose.scrollLeft = -300
    await swipe(mounted, [40, 50], [100, 50])
    expect(mounted.next).not.toHaveBeenCalled()
    await tap(mounted, 25, 50)
    expect(mounted.next).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})

it('uses the touch-start edge for vertical swipes and ignores ambiguous gestures', async () => {
  const mounted = await mount(true, true)
  try {
    mounted.prose.scrollLeft = -300
    await swipe(mounted, [40, 50], [100, 50])
    expect(mounted.next).toHaveBeenCalledTimes(1)
    mounted.prose.scrollLeft = 0
    await swipe(mounted, [100, 50], [40, 50])
    expect(mounted.prev).toHaveBeenCalledTimes(1)

    mounted.prose.scrollLeft = -150
    await swipe(mounted, [40, 50], [100, 50])
    await swipe(mounted, [50, 90], [50, 20])
    await swipe(mounted, [40, 50], [90, 50])
    expect(mounted.next).toHaveBeenCalledTimes(1)
    expect(mounted.prev).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})

it('allows both vertical swipe directions when a page fits the viewport', async () => {
  const mounted = await mount(true, true)
  Object.defineProperty(mounted.prose, 'scrollWidth', { configurable: true, value: 100 })
  try {
    await swipe(mounted, [40, 50], [100, 50])
    await swipe(mounted, [100, 50], [40, 50])
    expect(mounted.next).toHaveBeenCalledTimes(1)
    expect(mounted.prev).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})

it('maps horizontal pagination swipes and requires a vertical edge', async () => {
  const mounted = await mount(false, true)
  try {
    mounted.content.scrollTop = 100
    await swipe(mounted, [100, 50], [40, 50])
    await swipe(mounted, [40, 50], [100, 50])
    expect(mounted.next).toHaveBeenCalledTimes(1)
    expect(mounted.prev).toHaveBeenCalledTimes(1)

    mounted.content.scrollTop = 100
    await swipe(mounted, [50, 100], [50, 40])
    expect(mounted.next).toHaveBeenCalledTimes(1)
    mounted.content.scrollTop = 300
    await swipe(mounted, [50, 100], [50, 40])
    expect(mounted.next).toHaveBeenCalledTimes(2)
    mounted.content.scrollTop = 0
    await swipe(mounted, [50, 40], [50, 100])
    expect(mounted.prev).toHaveBeenCalledTimes(2)
  } finally {
    await mounted.cleanup()
  }
})

it('leaves links and overflowing nested content to native touch handling', async () => {
  const mounted = await mount(true, true)
  const link = document.createElement('a')
  link.href = '/chapter'
  mounted.target.appendChild(link)
  const scroller = document.createElement('div')
  scroller.style.overflowX = 'auto'
  Object.defineProperties(scroller, {
    clientWidth: { configurable: true, value: 50 }, scrollWidth: { configurable: true, value: 200 },
  })
  mounted.target.appendChild(scroller)
  try {
    mounted.prose.scrollLeft = -300
    await tap(mounted, 25, 50, link)
    await swipe(mounted, [40, 50], [100, 50], scroller)
    expect(mounted.next).not.toHaveBeenCalled()
    expect(mounted.prev).not.toHaveBeenCalled()
  } finally {
    await mounted.cleanup()
  }
})

it('long-presses for selection, cancels it on movement, and clears timers on unmount', async () => {
  vi.useFakeTimers()
  const mounted = await mount(true, true)
  const selection = { isCollapsed: true, rangeCount: 0, removeAllRanges: vi.fn(), addRange: vi.fn(), modify: vi.fn(), extend: vi.fn() }
  vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection)
  Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: vi.fn(() => document.createRange()) })
  try {
    await act(async () => {
      mounted.api().handleTouchStart(touch(mounted.target, 25, 50))
      vi.advanceTimersByTime(500)
      mounted.api().handleTouchEnd()
    })
    expect(selection.addRange).toHaveBeenCalledTimes(1)
    expect(selection.modify).toHaveBeenCalledTimes(2)
    expect(mounted.next).not.toHaveBeenCalled()

    selection.addRange.mockClear()
    await act(async () => {
      mounted.api().handleTouchStart(touch(mounted.target, 25, 50))
      mounted.api().handleTouchMove(touch(mounted.target, 40, 50))
      vi.advanceTimersByTime(500)
      mounted.api().handleTouchEnd()
    })
    expect(selection.addRange).not.toHaveBeenCalled()

    mounted.api().handleTouchStart(touch(mounted.target, 25, 50))
    await mounted.cleanup()
    vi.advanceTimersByTime(500)
    expect(selection.addRange).not.toHaveBeenCalled()
  } finally {
    if (document.body.contains(mounted.target)) await mounted.cleanup()
  }
})

it.each([true, false])('settles continuous tap scrolling after its animation vertical=%s', async vertical => {
  vi.useFakeTimers()
  vi.stubGlobal('innerHeight', 200)
  const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const mounted = await mount(vertical, false)
  try {
    await tap(mounted, vertical ? 25 : 50, vertical ? 50 : 150)
    expect(mounted.smooth.current).toBe(true)
    if (vertical) expect(mounted.content.scrollBy).toHaveBeenCalledWith({ left: -80, behavior: 'smooth' })
    else expect(windowScroll).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' })
    await act(async () => vi.advanceTimersByTime(500))
    expect(mounted.smooth.current).toBe(false)
    expect(mounted.settled).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})
