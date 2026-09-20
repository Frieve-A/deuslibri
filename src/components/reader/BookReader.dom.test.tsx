import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BookReader from '../BookReader'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { FakeSpeechSynthesisPort } from '@/lib/reader/speech/FakeSpeechSynthesisPort'
import { translations } from '@/lib/i18n/translations'
import type { Book } from '@/types/book'

vi.mock('next/navigation', () => ({ usePathname: () => '/book/dom-fixture/ja', useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/i18n', async () => ({ ...(await import('@/lib/i18n/translations')), useI18n: () => ({ t: translations.en }) }))
vi.mock('@/lib/books/markdown', () => ({ markdownToHtml: async (text: string) => text }))
vi.mock('../BookDetailsModal', () => ({ default: () => null }))

const fixture: Book = {
  id: 'dom-fixture', title: 'Fixture', author: 'Author', language: 'ja',
  description: '', summary: '', tags: [], publishDate: '2026-09-20',
  folderPath: 'fixture', content: '',
  pages: ['<p>最初の段落</p><p>本文が続きます。</p>', '<p>次の章</p>'],
}
const initialSettings = useReadingStore.getState().settings
let root: Root
let host: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  window.history.replaceState(null, '', '/book/dom-fixture/ja')
  useReadingStore.setState({ settings: initialSettings, progress: {}, recentlyRead: [], bookmarks: [], favorites: [] })
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe.each([
  { writingMode: 'horizontal', displayMode: 'pagination' },
  { writingMode: 'horizontal', displayMode: 'scroll' },
  { writingMode: 'vertical', displayMode: 'pagination' },
  { writingMode: 'vertical', displayMode: 'scroll' },
] as const)('BookReader DOM: $writingMode $displayMode', mode => {
  it.each(['wheel', 'touchstart', 'scroll'])('preserves externally translated text during %s', async eventType => {
    useReadingStore.getState().updateSettings(mode)
    const port = new FakeSpeechSynthesisPort()
    await act(async () => root.render(createElement(BookReader, { book: fixture, speechPort: port })))
    await act(async () => vi.advanceTimersByTime(700))
    const paragraph = host.querySelector('main .prose p')!
    expect(paragraph.textContent).toBe('最初の段落')
    const surface = mode.writingMode === 'vertical'
      ? host.querySelector<HTMLElement>('main .overflow-x-scroll')!
      : mode.displayMode === 'pagination'
        ? host.querySelector<HTMLElement>('main .overflow-y-auto')!
        : window
    const target = eventType === 'scroll' ? surface : paragraph
    const event = eventType === 'wheel'
      ? new WheelEvent('wheel', { deltaY: 100, bubbles: true })
      : eventType === 'touchstart'
        ? new TouchEvent('touchstart', { bubbles: true, touches: [{ clientX: 100, clientY: 200 } as Touch] })
        : new Event('scroll')
    // External translation is simulated; the actual reader event handlers run.
    paragraph.textContent = '第一の段落'
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(records => mutations.push(...records))
    observer.observe(paragraph.parentElement!, { childList: true, subtree: true, characterData: true })
    await act(async () => target.dispatchEvent(event))
    await act(async () => vi.advanceTimersByTime(eventType === 'touchstart' ? 100 : 500))
    observer.disconnect()
    expect(host.querySelector('main .prose p')?.textContent).toBe('第一の段落')
    expect(host.querySelector('main .prose p')).toBe(paragraph)
    expect(mutations).toEqual([])
  })
})
