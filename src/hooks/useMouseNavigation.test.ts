import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { useMouseNavigation } from './useMouseNavigation'

const initialSettings = useReadingStore.getState().settings

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  useReadingStore.setState({ settings: initialSettings })
})

function metrics(element: HTMLElement, width: number, height: number) {
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

const mouse = (target: EventTarget, x: number, y: number, button = 0) => ({
  button, clientX: x, clientY: y, target, preventDefault: vi.fn(),
}) as unknown as React.MouseEvent

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
  metrics(content, 100, 400)
  metrics(prose, 400, 100)
  const smooth = { current: false }
  const touchHandled = { current: false }
  const settled = vi.fn()
  const next = vi.fn()
  const prev = vi.fn()
  let api!: ReturnType<typeof useMouseNavigation>
  function Harness() {
    api = useMouseNavigation({ isVertical: vertical, isPagination: pagination, contentRef: { current: content },
      isSmoothScrollingRef: smooth, onPositionSettled: settled, touchHandledRef: touchHandled,
      goToNextPage: next, goToPrevPage: prev })
    return null
  }
  await act(async () => root.render(createElement(Harness)))
  return { api: () => api, content, prose, target, smooth, touchHandled, settled, next, prev, cleanup: async () => {
    await act(async () => root.unmount())
    host.remove()
  } }
}

async function click(mounted: Awaited<ReturnType<typeof mount>>, x: number, y: number, target: EventTarget = mounted.target) {
  await act(async () => {
    mounted.api().handleMouseDown(mouse(target, x, y))
    mounted.api().handleMouseUp(mouse(target, x, y))
  })
}

it('scrolls vertical pagination in reading order and turns only at the edges', async () => {
  const mounted = await mount(true, true)
  try {
    mounted.prose.scrollLeft = -100
    await click(mounted, 25, 50)
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -180, behavior: 'smooth' })
    mounted.prose.scrollLeft = -100
    await click(mounted, 75, 50)
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -20, behavior: 'smooth' })
    mounted.prose.scrollLeft = -300
    await click(mounted, 25, 50)
    expect(mounted.next).toHaveBeenCalledTimes(1)
    mounted.prose.scrollLeft = 0
    await click(mounted, 75, 50)
    expect(mounted.prev).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})

it('uses edge zones and vertical position in horizontal pagination', async () => {
  const mounted = await mount(false, true)
  try {
    await click(mounted, 10, 50)
    await click(mounted, 90, 50)
    expect(mounted.prev).toHaveBeenCalledTimes(1)
    expect(mounted.next).toHaveBeenCalledTimes(1)

    mounted.content.scrollTop = 100
    await click(mounted, 50, 75)
    expect(mounted.content.scrollTo).toHaveBeenLastCalledWith({ top: 180, behavior: 'smooth' })
    mounted.content.scrollTop = 100
    await click(mounted, 50, 25)
    expect(mounted.content.scrollTo).toHaveBeenLastCalledWith({ top: 20, behavior: 'smooth' })
    mounted.content.scrollTop = 300
    await click(mounted, 50, 75)
    expect(mounted.next).toHaveBeenCalledTimes(2)
    mounted.content.scrollTop = 0
    await click(mounted, 50, 25)
    expect(mounted.prev).toHaveBeenCalledTimes(2)
  } finally {
    await mounted.cleanup()
  }
})

it.each([true, false])('scrolls the correct continuous surface and commits after animation vertical=%s', async vertical => {
  vi.useFakeTimers()
  vi.stubGlobal('innerHeight', 200)
  const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  const mounted = await mount(vertical, false)
  try {
    await click(mounted, vertical ? 25 : 50, vertical ? 50 : 150)
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

it('gates scrolling and page turns independently', async () => {
  useReadingStore.getState().updateSettings({ interaction: { ...initialSettings.interaction,
    enableTapScroll: false, enableTapPageTurn: true } })
  const pageOnly = await mount(true, true)
  try {
    pageOnly.prose.scrollLeft = -100
    await click(pageOnly, 25, 50)
    expect(pageOnly.prose.scrollTo).not.toHaveBeenCalled()
    pageOnly.prose.scrollLeft = -300
    await click(pageOnly, 25, 50)
    expect(pageOnly.next).toHaveBeenCalledTimes(1)
  } finally {
    await pageOnly.cleanup()
  }

  useReadingStore.getState().updateSettings({ interaction: { ...initialSettings.interaction,
    enableTapScroll: true, enableTapPageTurn: false } })
  const scrollOnly = await mount(true, true)
  try {
    scrollOnly.prose.scrollLeft = -100
    await click(scrollOnly, 25, 50)
    expect(scrollOnly.prose.scrollTo).toHaveBeenCalled()
    scrollOnly.prose.scrollLeft = -300
    await click(scrollOnly, 25, 50)
    expect(scrollOnly.next).not.toHaveBeenCalled()
  } finally {
    await scrollOnly.cleanup()
  }
})

it('leaves links and drag selection alone and ignores non-left buttons', async () => {
  const mounted = await mount(false, true)
  const link = document.createElement('a')
  link.href = '/chapter'
  mounted.target.appendChild(link)
  const selection = {
    isCollapsed: true, rangeCount: 0, removeAllRanges: vi.fn(), addRange: vi.fn(), extend: vi.fn(),
  }
  vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection)
  Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: vi.fn(() => document.createRange()) })
  try {
    await click(mounted, 90, 50, link)
    expect(mounted.next).not.toHaveBeenCalled()

    await act(async () => {
      mounted.api().handleMouseDown(mouse(mounted.target, 40, 40))
      mounted.api().handleMouseMove(mouse(mounted.target, 60, 40))
      mounted.api().handleMouseUp(mouse(mounted.target, 60, 40))
    })
    expect(selection.addRange).toHaveBeenCalled()
    expect(mounted.next).not.toHaveBeenCalled()

    await act(async () => {
      mounted.api().handleMouseDown(mouse(mounted.target, 90, 50, 1))
      mounted.api().handleMouseUp(mouse(mounted.target, 90, 50, 1))
    })
    expect(mounted.next).not.toHaveBeenCalled()
  } finally {
    await mounted.cleanup()
  }
})

it('suppresses the synthetic mouse sequence after touch exactly once', async () => {
  const mounted = await mount(false, true)
  try {
    mounted.touchHandled.current = true
    await click(mounted, 90, 50)
    expect(mounted.next).not.toHaveBeenCalled()
    expect(mounted.touchHandled.current).toBe(false)
    await click(mounted, 90, 50)
    expect(mounted.next).toHaveBeenCalledTimes(1)
  } finally {
    await mounted.cleanup()
  }
})
