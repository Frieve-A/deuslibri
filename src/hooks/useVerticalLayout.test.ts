import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useVerticalLayout } from './useVerticalLayout'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function value(element: HTMLElement, name: string, amount: number) {
  Object.defineProperty(element, name, { configurable: true, value: amount })
}

async function mount(options: { vertical: boolean; pagination: boolean; direction: 'next' | 'prev' | null }) {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  if (typeof globalThis.ResizeObserver === 'undefined') {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
    })
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const content = document.createElement('div')
  const prose = document.createElement('div')
  content.appendChild(prose)
  value(content, 'clientHeight', 240)
  value(content, 'scrollHeight', 640)
  value(prose, 'clientWidth', 100)
  value(prose, 'scrollWidth', 400)
  const direction = { current: options.direction }
  function Harness({ page = 0 }: { page?: number }) {
    useVerticalLayout({ loading: false, isVertical: options.vertical, isPagination: options.pagination,
      currentPage: page, contentRef: { current: content }, navigationDirectionRef: direction })
    return null
  }
  await act(async () => root.render(createElement(Harness)))
  return { root, host, content, prose, direction, Harness, cleanup: async () => {
    await act(async () => root.unmount())
    host.remove()
  } }
}

it.each([
  [true, 'next', 0],
  [true, null, 0],
  [true, 'prev', -300],
  [false, 'next', 0],
  [false, null, 0],
  [false, 'prev', 400],
] as const)('positions %s writing after %s navigation at %s', async (vertical, direction, expected) => {
  const mounted = await mount({ vertical, pagination: true, direction })
  try {
    if (vertical) mounted.prose.scrollLeft = 123
    else mounted.content.scrollTop = 123
    await act(async () => vi.advanceTimersByTime(30))
    expect(vertical ? mounted.prose.scrollLeft : mounted.content.scrollTop).toBe(expected)
    expect(mounted.direction.current).toBeNull()
  } finally {
    await mounted.cleanup()
  }
})

it('applies the vertical pagination height and overflow contract to the inner prose', async () => {
  const mounted = await mount({ vertical: true, pagination: true, direction: null })
  try {
    expect(mounted.prose.style.getPropertyValue('height')).toBe('240px')
    expect(mounted.prose.style.getPropertyPriority('height')).toBe('important')
    expect(mounted.prose.style.getPropertyValue('max-height')).toBe('240px')
    expect(mounted.prose.style.getPropertyPriority('max-height')).toBe('important')
    expect(mounted.prose.style.overflowX).toBe('auto')
    expect(mounted.prose.style.overflowY).toBe('hidden')
  } finally {
    await mounted.cleanup()
  }
})

it('waits for changing layout measurements before positioning the previous page', async () => {
  const mounted = await mount({ vertical: true, pagination: true, direction: 'prev' })
  const widths = [200, 300, 300]
  Object.defineProperty(mounted.prose, 'scrollWidth', {
    configurable: true,
    get: () => widths.shift() ?? 300,
  })
  mounted.prose.scrollLeft = 17
  try {
    await act(async () => vi.advanceTimersByTime(20))
    expect(mounted.prose.scrollLeft).toBe(17)
    await act(async () => vi.advanceTimersByTime(10))
    expect(mounted.prose.scrollLeft).toBe(-200)
  } finally {
    await mounted.cleanup()
  }
})

it('debounces resize updates and disconnects every observer on cleanup', async () => {
  let callback!: ResizeObserverCallback
  const observe = vi.fn()
  const disconnect = vi.fn()
  class FakeResizeObserver {
    constructor(next: ResizeObserverCallback) { callback = next }
    observe = observe
    disconnect = disconnect
    unobserve() {}
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  const mounted = await mount({ vertical: true, pagination: true, direction: null })
  try {
    expect(observe).toHaveBeenCalledWith(mounted.content)
    value(mounted.content, 'clientHeight', 320)
    act(() => {
      window.dispatchEvent(new Event('resize'))
      callback([], {} as ResizeObserver)
      window.dispatchEvent(new Event('resize'))
    })
    await act(async () => vi.advanceTimersByTime(99))
    expect(mounted.prose.style.height).toBe('240px')
    await act(async () => vi.advanceTimersByTime(1))
    expect(mounted.prose.style.height).toBe('320px')

    await mounted.cleanup()
    expect(disconnect).toHaveBeenCalledTimes(1)
    value(mounted.content, 'clientHeight', 360)
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(200)
    expect(mounted.prose.style.height).toBe('320px')
  } finally {
    if (document.body.contains(mounted.host)) await mounted.cleanup()
  }
})

it.each([
  [true, false],
  [false, false],
] as const)('does not alter layout outside pagination vertical=%s', async (vertical, pagination) => {
  const mounted = await mount({ vertical, pagination, direction: 'prev' })
  try {
    await act(async () => vi.advanceTimersByTime(100))
    expect(mounted.prose.style.height).toBe('')
    expect(mounted.prose.scrollLeft).toBe(0)
    expect(mounted.content.scrollTop).toBe(0)
    expect(mounted.direction.current).toBe('prev')
  } finally {
    await mounted.cleanup()
  }
})
