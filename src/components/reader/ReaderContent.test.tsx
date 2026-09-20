import { act, createElement, createRef, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReaderContent } from './ReaderContent'

type Props = ComponentProps<typeof ReaderContent>

let host: HTMLDivElement
let root: Root
let contentRef: Props['contentRef']

const handlers = {
  handleTouchStart: vi.fn(),
  handleTouchMove: vi.fn(),
  handleTouchEnd: vi.fn(),
  handleMouseDown: vi.fn(),
  handleMouseMove: vi.fn(),
  handleMouseUp: vi.fn(),
}

const defaults: Props = {
  pageHtml: ['<h2>Page 1</h2><p>first</p>', '<h2>Page 2</h2><p>second</p>'],
  currentPage: 1,
  isVertical: false,
  isPagination: true,
  fontSize: 18,
  fontFamily: 'mincho',
  contentLanguage: 'ja',
  lineHeight: 1.8,
  marginSize: 'medium',
  theme: 'light',
  contentRef: createRef<HTMLDivElement>(),
  ...handlers,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  contentRef = createRef<HTMLDivElement>()
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function render(overrides: Partial<Props>) {
  await act(async () => {
    root.render(createElement(ReaderContent, { ...defaults, ...overrides, contentRef }))
  })
  return contentRef.current as HTMLDivElement
}

describe('ReaderContent layout contracts', () => {
  it('uses the inner vertical prose as the scroll surface in paginated vertical mode', async () => {
    const container = await render({ isVertical: true, isPagination: true })
    const prose = container.firstElementChild as HTMLElement

    expect(container.className).toContain('overflow-hidden')
    expect(prose.className).toContain('overflow-x-scroll')
    expect(prose.style.writingMode).toBe('vertical-rl')
    expect(prose.textContent).toContain('Page ２')
    expect(prose.textContent).not.toContain('Page １')
    expect(container.querySelector('[id^="scroll-page-"]')).toBeNull()
  })

  it('uses one horizontal container with addressable page sections in vertical scroll mode', async () => {
    const container = await render({ isVertical: true, isPagination: false })
    const prose = container.firstElementChild as HTMLElement

    expect(container.className).toContain('overflow-x-scroll')
    expect(container.className).toContain('overflow-y-hidden')
    expect(prose.style.writingMode).toBe('vertical-rl')
    expect(prose.style.width).toBe('max-content')
    expect(Array.from(prose.querySelectorAll('[id^="scroll-page-"]')).map(node => node.id)).toEqual([
      'scroll-page-0',
      'scroll-page-1',
    ])
    expect(prose.textContent).toContain('Page １')
    expect(prose.textContent).toContain('Page ２')
  })

  it('uses the referenced vertical container and renders only the selected horizontal page in pagination mode', async () => {
    const container = await render({ isVertical: false, isPagination: true })
    const prose = container.querySelector('.prose') as HTMLElement

    expect(container.className).toContain('overflow-y-auto')
    expect(container.className).toContain('overflow-x-hidden')
    expect(prose.style.writingMode).toBe('horizontal-tb')
    expect(prose.textContent).toContain('Page 2')
    expect(prose.textContent).not.toContain('Page 1')

    await act(async () => vi.advanceTimersByTime(50))
    expect((container.querySelector('[class*="pt-2"]') as HTMLElement).style.opacity).toBe('1')
  })

  it('renders every addressable page in document scroll mode and reveals it after restoration', async () => {
    const container = await render({ isVertical: false, isPagination: false })
    const prose = container.querySelector('.prose') as HTMLElement

    expect(container.className).toContain('pb-24')
    expect(prose.style.writingMode).toBe('horizontal-tb')
    expect(Array.from(container.querySelectorAll('[id^="scroll-page-"]')).map(node => node.id)).toEqual([
      'scroll-page-0',
      'scroll-page-1',
    ])
    expect(prose.style.opacity).toBe('0')
    await act(async () => window.dispatchEvent(new CustomEvent('scroll-restoration-complete')))
    expect(prose.style.opacity).toBe('1')
  })

  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const)('attaches reader input handlers in vertical=%s pagination=%s', async (isVertical, isPagination) => {
    const container = await render({ isVertical, isPagination })
    const eventHandlers = [
      ['touchstart', 'handleTouchStart'],
      ['touchmove', 'handleTouchMove'],
      ['touchend', 'handleTouchEnd'],
      ['mousedown', 'handleMouseDown'],
      ['mousemove', 'handleMouseMove'],
      ['mouseup', 'handleMouseUp'],
    ] as const

    for (const [eventName, handlerName] of eventHandlers) {
      await act(async () => container.dispatchEvent(new Event(eventName, { bubbles: true })))
      expect(handlers[handlerName]).toHaveBeenCalledTimes(1)
    }
    for (const handler of Object.values(handlers)) handler.mockClear()
  })
})
