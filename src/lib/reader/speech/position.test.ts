import { describe, expect, it, vi } from 'vitest'
import { speechHighlightRect, speechScrollDelta, firstVisibleSpeechAnchor, speechPositionRect } from './position'

describe('speech highlight centering', () => {
  it('measures the entire highlight across separate inline fragments', () => {
    const container = document.createElement('div')
    container.innerHTML = '<span data-speech-id="speech-1">First</span><ruby data-speech-id="speech-1">Last</ruby>'
    const elements = container.children
    vi.spyOn(elements[0], 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 400, 100, 25))
    vi.spyOn(elements[1], 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 425, 90, 75))
    const rect = speechHighlightRect(container, 'speech-1')!
    expect([rect.top, rect.bottom, rect.left, rect.right]).toEqual([400, 500, 20, 210])
    // Header ends at 80, footer starts at 620: usable center is 350.
    expect(speechScrollDelta(rect, { top: 80, bottom: 620, left: 0, right: 1000 }, false)).toBe(100)
  })
  it('centers even when the highlight is already fully visible', () => {
    expect(speechScrollDelta(new DOMRect(20, 200, 200, 100), { top: 80, bottom: 620, left: 0, right: 1000 }, false)).toBe(-100)
  })
  it('uses right-to-left logical movement for vertical text', () => {
    expect(speechScrollDelta(new DOMRect(200, 100, 100, 400), { top: 80, bottom: 620, left: 0, right: 1000 }, true)).toBe(250)
  })
})

it.each([false, true])('finds the first visible character of a long segment vertical=%s', vertical => {
  const container = document.createElement('div')
  container.innerHTML = '<span data-speech-id="long" data-speech-offset="0">abcdefghij</span>'
  const span = container.firstElementChild as HTMLElement
  vi.spyOn(span, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 500))
  const createRange = document.createRange.bind(document)
  const measure = vi.fn((range: Range) => vertical
    ? new DOMRect(500 - range.startOffset * 50, 100, 20, 20)
    : new DOMRect(100, range.startOffset * 50, 20, 20))
  const rangeSpy = vi.spyOn(document, 'createRange').mockImplementation(() => {
    const range = createRange()
    Object.defineProperty(range, 'getBoundingClientRect', { value: () => measure(range) })
    return range
  })
  try {
    const viewport = { left: 50, right: 320, top: 100, bottom: 400 }
    expect(firstVisibleSpeechAnchor(container, viewport)).toEqual({ id: 'long', offset: vertical ? 4 : 2 })
    measure.mockClear()
    speechPositionRect(container, 'long', 7)
    expect(measure).toHaveBeenCalledOnce()
  } finally { rangeSpy.mockRestore() }
})

it('does not resume at a clipped synthetic list number', () => {
  const container = document.createElement('div')
  container.innerHTML = '<ol><li data-speech-id="item" data-speech-offset="0"><span data-speech-id="item" data-speech-offset="3">abcdef</span></li></ol>'
  for (const element of container.querySelectorAll('[data-speech-id]')) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 100, 500))
  }
  const createRange = document.createRange.bind(document)
  const rangeSpy = vi.spyOn(document, 'createRange').mockImplementation(() => {
    const range = createRange()
    Object.defineProperty(range, 'getBoundingClientRect', { value: () => new DOMRect(100, range.startOffset * 50, 20, 20) })
    return range
  })
  try {
    const viewport = { left: 0, right: 300, top: 100, bottom: 400 }
    expect(speechPositionRect(container, 'item', 0)?.top).toBe(0)
    expect(firstVisibleSpeechAnchor(container, viewport)).toEqual({ id: 'item', offset: 5 })
  } finally { rangeSpy.mockRestore() }
})
