import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { usePageNavigation } from './usePageNavigation'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setMetrics(element: HTMLElement, values: Partial<Record<'clientWidth' | 'scrollWidth' | 'clientHeight' | 'scrollHeight', number>>) {
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(element, name, { configurable: true, value })
  }
}

function scrollMethods(element: HTMLElement) {
  element.scrollTo = vi.fn((options: ScrollToOptions) => {
    if (options.left !== undefined) element.scrollLeft = options.left
    if (options.top !== undefined) element.scrollTop = options.top
  }) as typeof element.scrollTo
  element.scrollBy = vi.fn((options: ScrollToOptions) => {
    element.scrollLeft += options.left ?? 0
    element.scrollTop += options.top ?? 0
  }) as typeof element.scrollBy
}

async function mount(options: { vertical: boolean; pagination: boolean; currentPage?: number }) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const content = document.createElement('div')
  const prose = document.createElement('div')
  content.appendChild(prose)
  setMetrics(content, { clientWidth: 100, scrollWidth: 100, clientHeight: 100, scrollHeight: 400 })
  setMetrics(prose, { clientWidth: 100, scrollWidth: 400, clientHeight: 100, scrollHeight: 100 })
  scrollMethods(content)
  scrollMethods(prose)
  const onNavigate = vi.fn()
  const onPositionChange = vi.fn()
  let api!: ReturnType<typeof usePageNavigation>
  function Harness() {
    api = usePageNavigation({
      currentPage: options.currentPage ?? 1,
      onNavigate,
      onPositionChange,
      totalPages: 3,
      displayMode: options.pagination ? 'pagination' : 'scroll',
      contentRef: { current: content },
      isVertical: options.vertical,
    })
    return null
  }
  await act(async () => root.render(createElement(Harness)))
  return { api: () => api, content, prose, onNavigate, onPositionChange, cleanup: async () => {
    await act(async () => root.unmount())
    host.remove()
  } }
}

it('bounds direct page changes and records their direction', async () => {
  const mounted = await mount({ vertical: false, pagination: true })
  const windowScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    await act(async () => mounted.api().goToNextPage())
    expect(mounted.onNavigate).toHaveBeenLastCalledWith(2, 'user', 'next')
    expect(mounted.api().navigationDirectionRef.current).toBe('next')
    expect(windowScroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(mounted.content.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })

    mounted.onNavigate.mockClear()
    await act(async () => mounted.api().goToPrevPage())
    expect(mounted.onNavigate).toHaveBeenCalledWith(0, 'user', 'prev')
    expect(mounted.api().navigationDirectionRef.current).toBe('prev')
  } finally {
    await mounted.cleanup()
  }

  for (const [currentPage, operation] of [[0, 'prev'], [2, 'next']] as const) {
    const edge = await mount({ vertical: false, pagination: true, currentPage })
    try {
      await act(async () => operation === 'prev' ? edge.api().goToPrevPage() : edge.api().goToNextPage())
      expect(edge.onNavigate).not.toHaveBeenCalled()
    } finally {
      await edge.cleanup()
    }
  }
})

it('scrolls vertical pagination by 80% before navigating at its reading edges', async () => {
  const mounted = await mount({ vertical: true, pagination: true })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    mounted.prose.scrollLeft = -100
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true })))
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -180, behavior: 'smooth' })
    mounted.prose.scrollLeft = -100
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true })))
    expect(mounted.prose.scrollTo).toHaveBeenLastCalledWith({ left: -20, behavior: 'smooth' })

    mounted.prose.scrollLeft = -300
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true })))
    expect(mounted.onNavigate).toHaveBeenLastCalledWith(2, 'user', 'next')
    mounted.prose.scrollLeft = 0
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })))
    expect(mounted.onNavigate).toHaveBeenLastCalledWith(0, 'user', 'prev')
    expect(mounted.onPositionChange).toHaveBeenCalledTimes(4)
  } finally {
    await mounted.cleanup()
  }
})

it('scrolls horizontal pagination by 80% before navigating at top and bottom', async () => {
  const mounted = await mount({ vertical: false, pagination: true })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  try {
    mounted.content.scrollTop = 100
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })))
    expect(mounted.content.scrollTo).toHaveBeenLastCalledWith({ top: 180, behavior: 'smooth' })
    mounted.content.scrollTop = 100
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true })))
    expect(mounted.content.scrollTo).toHaveBeenLastCalledWith({ top: 20, behavior: 'smooth' })
    mounted.content.scrollTop = 300
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true })))
    expect(mounted.onNavigate).toHaveBeenLastCalledWith(2, 'user', 'next')
    mounted.content.scrollTop = 0
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true })))
    expect(mounted.onNavigate).toHaveBeenLastCalledWith(0, 'user', 'prev')
  } finally {
    await mounted.cleanup()
  }
})

it.each([true, false])('uses only the scrolling surface in scroll mode vertical=%s', async vertical => {
  const mounted = await mount({ vertical, pagination: false })
  const windowScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  vi.stubGlobal('innerHeight', 200)
  try {
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: vertical ? 'ArrowDown' : 'ArrowRight', cancelable: true })))
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: vertical ? 'ArrowUp' : 'ArrowLeft', cancelable: true })))
    if (vertical) {
      expect(mounted.content.scrollBy).toHaveBeenNthCalledWith(1, { left: -80, behavior: 'smooth' })
      expect(mounted.content.scrollBy).toHaveBeenNthCalledWith(2, { left: 80, behavior: 'smooth' })
      expect(windowScroll).not.toHaveBeenCalled()
    } else {
      expect(windowScroll).toHaveBeenNthCalledWith(1, { top: 160, behavior: 'smooth' })
      expect(windowScroll).toHaveBeenNthCalledWith(2, { top: -160, behavior: 'smooth' })
    }
    expect(mounted.onNavigate).not.toHaveBeenCalled()
  } finally {
    await mounted.cleanup()
  }
})

it('prevents handled arrows, ignores editable controls, and removes its listener', async () => {
  const mounted = await mount({ vertical: false, pagination: true })
  const input = document.createElement('input')
  document.body.appendChild(input)
  try {
    const handled = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true })
    await act(async () => window.dispatchEvent(handled))
    expect(handled.defaultPrevented).toBe(true)
    const ignored = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    input.dispatchEvent(ignored)
    expect(ignored.defaultPrevented).toBe(false)
    expect(mounted.onPositionChange).toHaveBeenCalledTimes(1)
    await mounted.cleanup()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(mounted.onPositionChange).toHaveBeenCalledTimes(1)
  } finally {
    input.remove()
  }
})
