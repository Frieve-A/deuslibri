import { act, createElement, createRef, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReaderContent } from './ReaderContent'

type Props = ComponentProps<typeof ReaderContent>
const modes = [
  { isVertical: false, isPagination: true },
  { isVertical: false, isPagination: false },
  { isVertical: true, isPagination: true },
  { isVertical: true, isPagination: false },
]
const pageHtml = ['<p>最初の段落</p><img src="/fixture.png" alt="図">', '<p>次の章</p>']
const noop = () => {}
const defaults: Props = {
  pageHtml, currentPage: 0, isVertical: false, isPagination: true,
  fontSize: 18, fontFamily: 'mincho', contentLanguage: 'ja', lineHeight: 1.8,
  marginSize: 'medium', theme: 'light', contentRef: createRef<HTMLDivElement>(),
  handleTouchStart: noop, handleTouchMove: noop, handleTouchEnd: noop,
  handleMouseDown: noop, handleMouseMove: noop, handleMouseUp: noop,
}
let host: HTMLDivElement
let root: Root
let contentRef: Props['contentRef']

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  contentRef = createRef<HTMLDivElement>()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function render(overrides: Partial<Props>) {
  await act(async () => root.render(createElement(ReaderContent, { ...defaults, ...overrides, contentRef })))
}

describe.each(modes)('reader DOM stability: vertical=$isVertical pagination=$isPagination', mode => {
  it('preserves text nodes, images and selection on an unrelated render', async () => {
    await render(mode)
    const paragraph = host.querySelector('p')!
    const image = host.querySelector('img')!
    const text = paragraph.firstChild!
    const selection = window.getSelection()!
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 3)
    selection.removeAllRanges()
    selection.addRange(range)
    const records: MutationRecord[] = []
    const observer = new MutationObserver(changes => records.push(...changes))
    observer.observe(host, { childList: true, subtree: true, characterData: true })

    // New callbacks, styles and an equal HTML array must not replace book content.
    await render({ ...mode, pageHtml: [...pageHtml], fontSize: 20, handleMouseDown: () => {} })
    records.push(...observer.takeRecords())
    observer.disconnect()
    expect(host.querySelector('p')).toBe(paragraph)
    expect(paragraph.firstChild).toBe(text)
    expect(host.querySelector('img')).toBe(image)
    expect(selection.toString()).toBe('最初の')
    expect(records).toEqual([])
    expect((host.querySelector('.prose') as HTMLElement).style.fontSize).toBe('20px')
    selection.removeAllRanges()
  })

  it('does not undo external translation when the source HTML is unchanged', async () => {
    await render(mode)
    const paragraph = host.querySelector('p')!
    // Model the DOM edit made by a translator; no translation service is invoked.
    paragraph.textContent = '第一の段落'
    await render(mode)
    expect(host.querySelector('p')?.textContent).toBe('第一の段落')
    expect(host.querySelector('p')).toBe(paragraph)
  })

  it('still replaces content when the actual source changes', async () => {
    await render(mode)
    await render({ ...mode, pageHtml: ['<p>更新された本文</p>', '<p>次の章</p>'] })
    expect(host.querySelector('p')?.textContent).toBe('更新された本文')
  })

  it('declares the book language on the reading surface', async () => {
    await render(mode)
    expect(contentRef.current?.lang).toBe('ja')
    await render({ ...mode, contentLanguage: 'en' })
    expect(contentRef.current?.lang).toBe('en')
  })

  it('updates the selected page without replacing other scroll-mode pages', async () => {
    await render(mode)
    const paragraph = host.querySelector('p')!
    await render({ ...mode, currentPage: 1 })
    if (mode.isPagination) {
      expect(host.querySelector('p')?.textContent).toBe('次の章')
    } else {
      expect(host.querySelector('p')).toBe(paragraph)
      expect(host.querySelector('#scroll-page-1')?.textContent).toBe('次の章')
    }
  })
})
