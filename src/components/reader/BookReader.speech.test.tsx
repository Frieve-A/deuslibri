import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BookReader from '../BookReader'
import { FakeSpeechSynthesisPort } from '@/lib/reader/speech/FakeSpeechSynthesisPort'
import { useReadingStore } from '@/lib/stores/useReadingStore'
import { translations } from '@/lib/i18n/translations'
import type { Book } from '@/types/book'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => '/book/fixture/en' }))
vi.mock('@/lib/i18n', async () => ({ ...(await import('@/lib/i18n/translations')), useI18n: () => ({ t: translations.en }) }))
vi.mock('@/lib/books/markdown', () => ({ markdownToHtml: async (text: string) => text }))
vi.mock('@/lib/books/toc', () => ({ generateTableOfContents: () => [{ id: 'first', text: 'Go first', level: 1, pageIndex: 0 }] }))
vi.mock('../BookDetailsModal', () => ({ default: () => null }))

const initialSettings = useReadingStore.getState().settings
const fixture = (language: string): Book => ({ id: 'fixture', title: 'Fixture', author: 'Author', language,
  description: '', summary: '', tags: [], publishDate: '2026-09-11', folderPath: 'fixture', content: '',
  pages: ['<p>First.</p>', '<h2>Chapter 12</h2><p><ruby>東京<rt>とうきょう</rt></ruby> body.</p>', '<pre>excluded</pre>', '<p>Last.</p>'] })
let root: Root
let container: HTMLDivElement
let scrollY = 0
const rect = (left: number, right: number, top: number, bottom: number) => ({ left, right, top, bottom,
  x: left, y: top, width: right - left, height: bottom - top, toJSON: () => ({}) }) as DOMRect

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  scrollY = 0
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
  vi.spyOn(window, 'scrollTo').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    scrollY = typeof options === 'number' ? y ?? 0 : options.top ?? scrollY
  })
  vi.spyOn(window, 'scrollBy').mockImplementation((options: ScrollToOptions | number, y?: number) => {
    scrollY += typeof options === 'number' ? y ?? 0 : options.top ?? 0
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-speech-id')) return rect(0, 0, 0, 0)
    if (this.hasAttribute('data-reader-footer')) return rect(0, 1000, 700, 800)
    if (this.tagName === 'HEADER') return rect(0, 1000, 0, 80)
    if (this.id.startsWith('scroll-page-')) {
      const page = Number(this.id.slice(12))
      const vertical = useReadingStore.getState().settings.writingMode === 'vertical'
      const scrollContainer = this.closest<HTMLElement>('.overflow-x-scroll')
      return vertical ? rect(500 - page * 500 - (scrollContainer?.scrollLeft ?? 0), 1000 - page * 500 - (scrollContainer?.scrollLeft ?? 0), 80, 800)
        : rect(0, 1000, 80 + page * 500 - scrollY, 580 + page * 500 - scrollY)
    }
    return rect(0, 1000, 80, 800)
  })
  vi.stubGlobal('scrollTo', window.scrollTo)
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: function (options: ScrollToOptions) {
    if (options.left !== undefined) this.scrollLeft = options.left
    if (options.top !== undefined) this.scrollTop = options.top
  } })
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: function (options: ScrollToOptions) {
    this.scrollLeft += options.left ?? 0
    this.scrollTop += options.top ?? 0
  } })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  window.history.replaceState(null, '', '/book/fixture/en')
  useReadingStore.setState({ settings: { ...initialSettings, speech: { rate: 1, continueAcrossPages: true, voiceByLanguage: {}, allowRemoteVoiceByLanguage: {} } }, progress: {}, recentlyRead: [] })
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
async function mount(language: string, vertical: boolean, pagination: boolean, supported = true) {
  const book = fixture(language)
  const port = new FakeSpeechSynthesisPort()
  port.supported = supported
  port.voices = [{ voiceURI: language, name: language, lang: language === 'ja' ? 'ja-JP' : 'en-US', localService: true, default: true }]
  useReadingStore.getState().updateSettings({ writingMode: vertical ? 'vertical' : 'horizontal', displayMode: pagination ? 'pagination' : 'scroll' })
  if (pagination) window.history.replaceState(null, '', '/book/fixture/en?page=2')
  else useReadingStore.getState().setProgress(book.id, language, 1, vertical ? -500 : 500)
  await act(async () => root.render(createElement(BookReader, { book, speechPort: port })))
  await act(async () => vi.advanceTimersByTime(600))
  return { port, book }
}

describe('BookReader speech integration', () => {
  it.each([
    ['ja', true, true], ['ja', true, false], ['en', false, true], ['en', false, false],
  ] as const)('starts at the visible page and commits normal continuation in %s vertical=%s pagination=%s', async (language, vertical, pagination) => {
    const { port } = await mount(language, vertical, pagination)
    expect(port.requests).toHaveLength(0)
    await act(async () => {
      button(translations.en.reader.speech.play).click()
      expect(port.requests).toHaveLength(1)
    })
    expect(port.requests[0].request.text).toBe('Chapter 12')
    await act(async () => port.emitEnd())
    expect(port.requests[1].request.text).toBe('とうきょう body.')
    await act(async () => port.emitEnd())
    expect(port.requests).toHaveLength(2)
    await act(async () => vi.advanceTimersByTime(32))
    expect(port.requests[2].request.text).toBe('Last.')
    const progress = useReadingStore.getState().getProgress('fixture', language)!
    expect(progress.currentPage).toBe(3)
    if (pagination) expect(window.location.search).toBe('?page=4')
    if (!pagination) expect(progress.scrollPosition).toBe(vertical ? -1500 : 1500)
    await act(async () => button(translations.en.reader.speech.stop).click())
    await act(async () => port.emitEnd(2))
    expect(port.requests).toHaveLength(3)
  })

  it('lets a same-tick manual page operation invalidate an already requested speech continuation', async () => {
    const { port } = await mount('en', false, true)
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => port.emitEnd())
    await act(async () => {
      port.emitEnd()
      const previous = Array.from(container.querySelectorAll('button')).find(element => element.textContent?.includes('← Prev'))!
      previous.click()
    })
    await act(async () => vi.advanceTimersByTime(100))
    expect(port.requests).toHaveLength(2)
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(0)
    expect(button(translations.en.reader.speech.play).disabled).toBe(false)
  })

  it('preserves speech across the pagination surface reset after a page commit', async () => {
    const { port } = await mount('en', false, true)
    const target = container.querySelector<HTMLElement>('main .overflow-y-auto')!
    let top = 100
    Object.defineProperty(target, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        if (top === value) return
        top = value
        setTimeout(() => target.dispatchEvent(new Event('scroll')), 0)
      },
    })
    await act(async () => button(translations.en.reader.speech.play).click())
    const cancelCount = port.cancelCount
    await act(async () => port.emitEnd())
    await act(async () => port.emitEnd())
    await act(async () => vi.advanceTimersByTime(100))
    expect(top).toBe(0)
    expect(port.cancelCount).toBe(cancelCount)
    expect(port.requests).toHaveLength(3)
    expect(port.requests[2].request.text).toBe('Last.')
  })

  it.each([false, true])('keeps a new session alive after an earlier native scroll save vertical=%s', async (vertical) => {
    const { port } = await mount(vertical ? 'ja' : 'en', vertical, false)
    const target = vertical ? container.querySelector('.overflow-x-scroll')! : window
    await act(async () => target.dispatchEvent(new Event('scroll')))
    await act(async () => vi.advanceTimersByTime(100))
    await act(async () => button(translations.en.reader.speech.play).click())
    const cancelCount = port.cancelCount
    await act(async () => vi.advanceTimersByTime(500))
    expect(port.cancelCount).toBe(cancelCount)
    await act(async () => port.emitEnd())
    expect(port.requests).toHaveLength(2)
  })

  it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
    'cancels synchronously on native scroll vertical=%s pagination=%s', async (vertical, pagination) => {
      const { port } = await mount(vertical ? 'ja' : 'en', vertical, pagination)
      await act(async () => button(translations.en.reader.speech.play).click())
      const cancelCount = port.cancelCount
      const target = vertical ? container.querySelector('.overflow-x-scroll')!
        : pagination ? container.querySelector('main .overflow-y-auto')! : window
      await act(async () => {
        target.dispatchEvent(new Event('scroll'))
        expect(port.cancelCount).toBeGreaterThan(cancelCount)
        port.emitEnd()
      })
      expect(port.requests).toHaveLength(1)
    })

  it.each([['mouse', false], ['touch', false], ['mouse', true], ['touch', true]] as const)(
    'keeps a new session alive after an earlier %s scroll completes vertical=%s', async (input, vertical) => {
      const { port } = await mount(vertical ? 'ja' : 'en', vertical, false)
      const paragraph = container.querySelector('#scroll-page-1 p')!
      await act(async () => {
        if (input === 'mouse') {
          paragraph.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 600, clientY: 700 }))
          paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 600, clientY: 700 }))
        } else {
          const start = new Event('touchstart', { bubbles: true })
          Object.defineProperty(start, 'touches', { value: [{ clientX: 600, clientY: 700 }] })
          paragraph.dispatchEvent(start)
          paragraph.dispatchEvent(new Event('touchend', { bubbles: true }))
        }
      })
      await act(async () => vi.advanceTimersByTime(100))
      await act(async () => button(translations.en.reader.speech.play).click())
      const cancelCount = port.cancelCount
      await act(async () => vi.advanceTimersByTime(500))
      expect(port.cancelCount).toBe(cancelCount)
      expect(button(translations.en.reader.speech.pause)).not.toBeNull()
    })

  it('remembers a successful default voice trial and keeps its session and later play usable', async () => {
    const { port } = await mount('en', false, true)
    await act(async () => { port.setVoices([]); vi.advanceTimersByTime(3000) })
    await act(async () => button(translations.en.reader.speech.play).click())
    expect(port.requests).toHaveLength(1)
    expect(useReadingStore.getState().settings.speech.voiceByLanguage.en).toBeUndefined()
    const cancelCount = port.cancelCount
    await act(async () => port.emitStart())
    expect(useReadingStore.getState().settings.speech.voiceByLanguage.en).toEqual({ mode: 'ua-default', lang: 'en-US' })
    expect(port.cancelCount).toBe(cancelCount)
    await act(async () => port.emitEnd())
    expect(port.requests).toHaveLength(2)
    await act(async () => button(translations.en.reader.speech.stop).click())
    expect(button(translations.en.reader.speech.play).disabled).toBe(false)
    await act(async () => button(translations.en.reader.speech.play).click())
    expect(port.requests).toHaveLength(3)
    expect(port.requests[2].request.voiceURI).toBeUndefined()
  })

  it.each(['sync', 'async'] as const)('does not remember a failed default voice trial (%s)', async (failure) => {
    const { port } = await mount('en', false, true)
    await act(async () => { port.setVoices([]); vi.advanceTimersByTime(3000) })
    if (failure === 'sync') vi.spyOn(port, 'speak').mockImplementation(() => { throw new Error('failed') })
    await act(async () => button(translations.en.reader.speech.play).click())
    if (failure === 'async') await act(async () => port.emitError('not-allowed'))
    expect(useReadingStore.getState().settings.speech.voiceByLanguage.en).toBeUndefined()
  })

  it('keeps reading and keyboard navigation available when speech is unsupported', async () => {
    const { port } = await mount('en', false, true, false)
    expect(container.querySelector('main')?.textContent).toContain('Chapter 12')
    expect(button(translations.en.reader.speech.play).disabled).toBe(true)
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(2)
    expect(port.requests).toHaveLength(0)
  })

  it.each([
    ['mouse', false], ['touch', false], ['mouse', true], ['touch', true],
  ] as const)('jumps to the tapped text with %s while playing vertical=%s', async (input, vertical) => {
    const language = vertical ? 'ja' : 'en'
    const { port } = await mount(language, vertical, false)
    await act(async () => button(translations.en.reader.speech.play).click())
    const paragraph = container.querySelector('#scroll-page-1 p')!
    await act(async () => {
      if (input === 'mouse') {
        paragraph.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 700 }))
        paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 100, clientY: 700 }))
      } else {
        const start = new Event('touchstart', { bubbles: true })
        Object.defineProperty(start, 'touches', { value: [{ clientX: 100, clientY: 700 }] })
        paragraph.dispatchEvent(start)
        paragraph.dispatchEvent(new Event('touchend', { bubbles: true }))
      }
    })
    await act(async () => { vi.advanceTimersByTime(550); port.emitEnd(0) })
    expect(useReadingStore.getState().getProgress('fixture', language)?.currentPage).toBe(1)
    expect(port.requests).toHaveLength(2)
    expect(port.requests[1].request.text).toBe('とうきょう body.')
    expect(button(translations.en.reader.speech.pause)).not.toBeNull()
  })

  it.each(['progress', 'keyboard', 'wheel'] as const)('stops and ignores old end events after %s input', async (input) => {
    const { port } = await mount('en', false, true)
    await act(async () => button(translations.en.reader.speech.play).click())
    const paragraph = container.querySelector('main p')!
    await act(async () => {
      if (input === 'progress') {
        container.querySelector('.ui-skin-progress')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0 }))
        document.dispatchEvent(new MouseEvent('mouseup'))
      } else if (input === 'keyboard') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      } else if (input === 'wheel') {
        paragraph.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 10 }))
      }
      port.emitEnd(0)
    })
    await act(async () => vi.advanceTimersByTime(100))
    expect(port.requests).toHaveLength(1)
    expect(button(translations.en.reader.speech.play).disabled).toBe(false)
    if (input !== 'wheel') expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(0)
  })

  it('routes table-of-contents navigation through the same user cancellation path', async () => {
    const { port } = await mount('en', false, true)
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => button(translations.en.reader.tableOfContents).click())
    await act(async () => {
      Array.from(container.querySelectorAll('button')).find(element => element.textContent?.includes('Go first'))!.click()
      port.emitEnd(0)
    })
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(0)
    expect(port.requests).toHaveLength(1)
  })

  it('keeps auto-resuming auto-scroll stopped after speech until an explicit play action', async () => {
    useReadingStore.getState().updateSettings({ autoScroll: { ...initialSettings.autoScroll,
      enabled: true, autoPageTurn: true, startDelay: 5000, autoPageTurnDelay: 1000, userInteractionBehavior: 'autoResume' } })
    const { port } = await mount('en', false, true)
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => button(translations.en.reader.speech.stop).click())
    await act(async () => vi.advanceTimersByTime(15000))
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(1)
    expect(port.requests).toHaveLength(1)
  })

  it('preserves ordinary auto page turning across multiple pages', async () => {
    useReadingStore.getState().updateSettings({ autoScroll: { ...initialSettings.autoScroll,
      enabled: true, autoPageTurn: true, startDelay: 1000, autoPageTurnDelay: 1000, userInteractionBehavior: 'pause' } })
    await mount('en', false, true)
    expect(button('Pause auto scroll')).not.toBeNull()
    await act(async () => vi.advanceTimersByTime(2200))
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(2)
    expect(button('Pause auto scroll')).not.toBeNull()
    await act(async () => vi.advanceTimersByTime(2200))
    expect(useReadingStore.getState().getProgress('fixture', 'en')?.currentPage).toBe(3)
  })

  it('uses a missing saved voice fallback without altering the saved choice', async () => {
    const { port } = await mount('en', false, true)
    await act(async () => useReadingStore.getState().updateSettings({ speech: {
      ...initialSettings.speech, voiceByLanguage: { en: { mode: 'listed', voiceURI: 'missing', lang: 'en-US' } },
    } }))
    expect(button(translations.en.reader.speech.settings)).toBeNull()
    await act(async () => button(translations.en.reader.speech.play).click())
    expect(port.requests[0].request.voiceURI).toBe('en')
    expect(useReadingStore.getState().settings.speech.voiceByLanguage.en.voiceURI).toBe('missing')
  })

  it('cancels on book and mode changes without creating a new first utterance', async () => {
    const { port, book } = await mount('en', false, true)
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => useReadingStore.getState().updateSettings({ displayMode: 'scroll' }))
    await act(async () => port.emitEnd(0))
    expect(port.requests).toHaveLength(1)
    await act(async () => root.render(createElement(BookReader, { book: { ...book, id: 'other' }, speechPort: port })))
    expect(port.requests).toHaveLength(1)
  })
})


it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
  'follows spoken text without cancelling on its delayed scroll event vertical=%s pagination=%s', async (vertical, pagination) => {
    const { port } = await mount(vertical ? 'ja' : 'en', vertical, pagination)
    const anchor = container.querySelector<HTMLElement>(pagination ? 'main [data-speech-id]' : '#scroll-page-1 [data-speech-id]')!
    const anchorId = anchor.dataset.speechId
    const surface = vertical ? container.querySelector<HTMLElement>('.overflow-x-scroll')!
      : pagination ? container.querySelector<HTMLElement>('main .overflow-y-auto')! : null
    if (surface) {
      Object.defineProperty(surface, vertical ? 'scrollWidth' : 'scrollHeight', { configurable: true, value: 3000 })
      Object.defineProperty(surface, vertical ? 'clientWidth' : 'clientHeight', { configurable: true, value: 720 })
    } else Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 3000 })
    const previousRect = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.speechId === anchorId) return vertical ? rect(-100, -80, 100, 120) : rect(10, 30, 1200, 1220)
      return previousRect.call(this)
    })
    await act(async () => button(translations.en.reader.speech.play).click())
    const cancels = port.cancelCount
    const initialPosition = vertical ? -surface!.scrollLeft : pagination ? surface!.scrollTop : scrollY
    await act(async () => vi.advanceTimersByTime(32))
    const middlePosition = vertical ? -surface!.scrollLeft : pagination ? surface!.scrollTop : scrollY
    expect(middlePosition).toBeGreaterThan(initialPosition)
    expect(vertical ? surface!.scrollLeft : pagination ? surface!.scrollTop : scrollY).not.toBe(0)
    await act(async () => (surface ?? window).dispatchEvent(new Event('scroll')))
    expect(port.cancelCount).toBe(cancels)
    await act(async () => vi.advanceTimersByTime(300))
    const finalPosition = vertical ? -surface!.scrollLeft : pagination ? surface!.scrollTop : scrollY
    expect(finalPosition).toBeGreaterThan(middlePosition)
    await act(async () => (surface ?? window).dispatchEvent(new Event('scroll')))
    expect(port.cancelCount).toBe(cancels)
    await act(async () => port.emitEnd())
    expect(port.requests).toHaveLength(2)
  })


it('moves the highlight with speech and seeking, retains it while paused, and clears it on stop', async () => {
  const { port } = await mount('en', false, true)
  const previousRect = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-speech-id') ? rect(20, 80, 200, 220) : previousRect.call(this)
  })
  expect(container.querySelector('[data-speech-active]')).toBeNull()
  await act(async () => button(translations.en.reader.speech.play).click())
  expect(container.querySelector('[data-speech-active]')?.textContent).toBe('Chapter 12')
  await act(async () => port.emitEnd())
  expect(container.querySelector('h2 [data-speech-active]')).toBeNull()
  expect(container.querySelector('ruby[data-speech-active]')).not.toBeNull()
  await act(async () => button(translations.en.reader.speech.pause).click())
  expect(container.querySelector('[data-speech-active]')).not.toBeNull()
  await act(async () => button(translations.en.reader.speech.resume).click())
  const heading = container.querySelector('main h2')!
  await act(async () => {
    heading.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 100 }))
    heading.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 20, clientY: 100 }))
  })
  expect(container.querySelector('[data-speech-active]')?.textContent).toBe('Chapter 12')
  await act(async () => button(translations.en.reader.speech.stop).click())
  expect(container.querySelector('[data-speech-active]')).toBeNull()
})

it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
  'persists a URL scroll target for the next visit vertical=%s saved=%s', async (vertical, saved) => {
    const language = vertical ? 'ja' : 'en'
    const book = fixture(language)
    const port = new FakeSpeechSynthesisPort()
    useReadingStore.getState().updateSettings({ writingMode: vertical ? 'vertical' : 'horizontal', displayMode: 'scroll' })
    if (saved) useReadingStore.getState().setProgress(book.id, language, 1, vertical ? -500 : 500)
    window.history.replaceState(null, '', '/book/fixture/en?page=4')
    await act(async () => root.render(createElement(BookReader, { book, speechPort: port })))
    await act(async () => vi.advanceTimersByTime(600))
    const position = () => vertical ? container.querySelector<HTMLElement>('.overflow-x-scroll')!.scrollLeft : scrollY
    const targetPosition = vertical ? -1500 : 1484
    expect(position()).toBe(targetPosition)
    expect.soft(useReadingStore.getState().getProgress(book.id, language)).toMatchObject({ currentPage: 3, scrollPosition: targetPosition })
    expect(window.location.search).toBe('')

    await act(async () => root.unmount())
    scrollY = 0
    root = createRoot(container)
    await act(async () => root.render(createElement(BookReader, { book, speechPort: port })))
    await act(async () => vi.advanceTimersByTime(600))
    expect(position()).toBe(targetPosition)
    expect(useReadingStore.getState().getProgress(book.id, language)?.currentPage).toBe(3)
  })

it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
  'resumes from visible text after paused viewport movement vertical=%s pagination=%s', async (vertical, pagination) => {
    const { port } = await mount(vertical ? 'ja' : 'en', vertical, pagination)
    const surface = vertical ? container.querySelector<HTMLElement>('.overflow-x-scroll')!
      : pagination ? container.querySelector<HTMLElement>('main .overflow-y-auto')! : null
    const position = () => vertical ? -surface!.scrollLeft : pagination ? surface!.scrollTop : scrollY
    const initialPosition = position()
    const previousRect = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('data-speech-id')) {
        if (!this.dataset.speechId?.startsWith('speech-1-')) return rect(0, 0, 0, 0)
        const heading = !!this.closest('h2')
        const movement = position() - initialPosition
        return vertical ? rect((heading ? 800 : 200) + movement, (heading ? 820 : 220) + movement, 120, 140)
          : rect(100, 120, (heading ? 120 : 800) - movement, (heading ? 140 : 820) - movement)
      }
      return previousRect.call(this)
    })
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => button(translations.en.reader.speech.pause).click())
    await act(async () => {
      container.querySelector('main')!.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 500 }))
      if (vertical) surface!.scrollLeft -= 500
      else if (pagination) surface!.scrollTop += 500
      else scrollY += 500
      ;(surface ?? window).dispatchEvent(new Event('scroll'))
    })
    expect.soft(button(translations.en.reader.speech.resume)).not.toBeNull()
    await act(async () => (button(translations.en.reader.speech.resume) ?? button(translations.en.reader.speech.play)).click())
    expect(port.requests).toHaveLength(2)
    expect(port.requests[1].request.text).toBe('とうきょう body.')
  })

it.each([[false, false], [true, false], [false, true], [true, true]] as const)(
  'keeps the native cursor when paused text remains visible vertical=%s pagination=%s', async (vertical, pagination) => {
    const { port } = await mount(vertical ? 'ja' : 'en', vertical, pagination)
    const previousRect = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-speech-id') && this.dataset.speechId?.startsWith('speech-1-')
        ? rect(100, 200, 200, 220) : previousRect.call(this)
    })
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => { port.emitStart(); port.requests[0].events.onBoundary?.(4) })
    await act(async () => button(translations.en.reader.speech.pause).click())
    const cancels = port.cancelCount
    const surface = vertical ? container.querySelector<HTMLElement>('.overflow-x-scroll')!
      : pagination ? container.querySelector<HTMLElement>('main .overflow-y-auto')! : window
    await act(async () => surface.dispatchEvent(new Event('scroll')))
    await act(async () => button(translations.en.reader.speech.resume).click())
    expect(port.requests).toHaveLength(1)
    expect(port.cancelCount).toBe(cancels)
    expect(port.resumeCount).toBe(2)
  })

it.each(['start', 'resume'] as const)('uses a visible character inside a clipped segment on %s', async action => {
  const { port } = await mount('en', false, true)
  const surface = container.querySelector<HTMLElement>('main .overflow-y-auto')!
  const previousRect = vi.mocked(HTMLElement.prototype.getBoundingClientRect).getMockImplementation()!
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-speech-id')) return this.closest('h2') ? rect(100, 120, 120 - surface.scrollTop, 720 - surface.scrollTop) : rect(0, 0, 0, 0)
    return previousRect.call(this)
  })
  const createRange = document.createRange.bind(document)
  vi.spyOn(document, 'createRange').mockImplementation(() => {
    const range = createRange()
    Object.defineProperty(range, 'getBoundingClientRect', { value: () => {
      const top = 120 + range.startOffset * 60 - surface.scrollTop
      return rect(100, 120, top, top + 20)
    } })
    return range
  })
  if (action === 'resume') {
    await act(async () => button(translations.en.reader.speech.play).click())
    await act(async () => button(translations.en.reader.speech.pause).click())
  }
  await act(async () => {
    surface.scrollTop = 240
    surface.dispatchEvent(new Event('scroll'))
  })
  await act(async () => button(action === 'resume' ? translations.en.reader.speech.resume : translations.en.reader.speech.play).click())
  expect(port.requests.at(-1)?.request.text).toBe('ter 12')
  expect(port.requests).toHaveLength(action === 'resume' ? 2 : 1)
})

it('keeps paused speech paused when no spoken text is visible', async () => {
  const { port } = await mount('en', false, true)
  await act(async () => button(translations.en.reader.speech.play).click())
  await act(async () => button(translations.en.reader.speech.pause).click())
  await act(async () => button(translations.en.reader.speech.resume).click())
  expect(button(translations.en.reader.speech.resume)).not.toBeNull()
  expect(port.resumeCount).toBe(1)
  expect(port.requests).toHaveLength(1)
})

it('still stops paused speech on explicit page navigation', async () => {
  const { port } = await mount('en', false, true)
  await act(async () => button(translations.en.reader.speech.play).click())
  await act(async () => button(translations.en.reader.speech.pause).click())
  await act(async () => {
    Array.from(container.querySelectorAll('button')).find(element => element.textContent?.includes('Next →'))!.click()
  })
  expect(button(translations.en.reader.speech.play)).not.toBeNull()
  expect(button(translations.en.reader.speech.resume)).toBeNull()
  expect(port.requests).toHaveLength(1)
})
