/** Resolve annotated text without changing the reader's ruby or vertical markup. */
export function speechAnchorAtPoint(target: Element, x: number, y: number): { element: HTMLElement; offset: number } | null {
  if (target.closest('a, button, input, select, textarea')) return null
  const doc = target.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  const caret = doc.caretPositionFromPoint?.(x, y)
  const range = !caret ? doc.caretRangeFromPoint?.(x, y) : null
  const node = caret?.offsetNode ?? range?.startContainer
  const offset = caret?.offset ?? range?.startOffset ?? 0
  const hit = node?.nodeType === 1 ? node as Element : node?.parentElement
  const element = (hit && (target.contains(hit) || hit.contains(target)) ? hit.closest<HTMLElement>('[data-speech-id]') : null)
    ?? target.closest<HTMLElement>('[data-speech-id]') ?? target.querySelector<HTMLElement>('[data-speech-id]')
  if (!element) return null
  let spokenOffset = Number(element.dataset.speechOffset ?? 0)
  if (node && element.contains(node) && element.tagName === 'SPAN' && !element.classList.contains('katex')) {
    const prefix = doc.createRange()
    prefix.selectNodeContents(element)
    prefix.setEnd(node, offset)
    spokenOffset += prefix.toString().replace(/\s+/gu, ' ').length
  }
  return { element, offset: spokenOffset }
}

/** Offsets follow the normalized UTF-16 text sent to speech synthesis. */
function* speechCharacters(element: HTMLElement) {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  let offset = Number(element.dataset.speechOffset ?? 0)
  let previousSpace = false
  const range = element.ownerDocument.createRange()
  while (node) {
    const text = node.textContent ?? ''
    for (let i = 0; i < text.length;) {
      const length = text.codePointAt(i)! > 0xffff ? 2 : 1
      const space = /\s/u.test(text[i])
      if (!space || !previousSpace) {
        range.setStart(node, i)
        range.setEnd(node, i + length)
        yield { offset, length, range }
        offset += length
      }
      previousSpace = space
      i += length
    }
    node = walker.nextNode()
  }
}

function speechElementRect(element: HTMLElement): DOMRect {
  // Ordered-list numbers are synthetic speech anchored to the first rendered text,
  // rather than the full list-item box, which can extend beyond the viewport.
  const first = element.tagName === 'LI' ? element.querySelector<HTMLElement>('[data-speech-id]') : null
  return first ? speechPositionRect(element, first.dataset.speechId!, Number(first.dataset.speechOffset))
    ?? element.getBoundingClientRect() : element.getBoundingClientRect()
}

export function speechPositionRect(container: HTMLElement, id: string, charIndex: number): DOMRect | null {
  const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-speech-id="' + id + '"]'))
  const element = elements.filter(item => Number(item.dataset.speechOffset) <= charIndex).at(-1) ?? elements[0]
  if (!element) return null
  if (element.tagName === 'SPAN' && !element.classList.contains('katex')) {
    for (const character of speechCharacters(element)) {
      if (character.offset + character.length > charIndex) return typeof character.range.getBoundingClientRect === 'function'
        ? character.range.getBoundingClientRect() : element.getBoundingClientRect()
    }
  }
  return speechElementRect(element)
}

/** Union every fragment: one spoken segment may span ruby, emphasis, and lines. */
export function speechHighlightRect(container: HTMLElement, id: string): DOMRect | null {
  const rects = Array.from(container.querySelectorAll<HTMLElement>('[data-speech-id="' + id + '"]'))
    .map(element => element.getBoundingClientRect()).filter(rect => rect.width || rect.height)
  if (!rects.length) return null
  const left = Math.min(...rects.map(rect => rect.left))
  const right = Math.max(...rects.map(rect => rect.right))
  const top = Math.min(...rects.map(rect => rect.top))
  const bottom = Math.max(...rects.map(rect => rect.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

/** Logical scrolling is downward for horizontal text, leftward for vertical text. */
export function speechScrollDelta(rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  viewport: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>, vertical: boolean): number {
  return vertical
    ? (viewport.left + viewport.right - rect.left - rect.right) / 2
    : (rect.top + rect.bottom - viewport.top - viewport.bottom) / 2
}

export type SpeechViewport = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>

/** Share the usable reader surface between following speech and resuming it. */
export function speechViewport(surface: HTMLElement | Window): SpeechViewport {
  const bounds = surface === window
    ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
    : (surface as HTMLElement).getBoundingClientRect()
  const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
  const footerTop = document.querySelector('[data-reader-footer]')?.getBoundingClientRect().top ?? window.innerHeight
  return {
    top: Math.max(bounds.top, headerBottom, 0),
    bottom: Math.min(bounds.bottom, footerTop, window.innerHeight),
    left: Math.max(bounds.left, 0), right: Math.min(bounds.right, window.innerWidth),
  }
}

export function speechRectIsVisible(rect: SpeechViewport, viewport: SpeechViewport): boolean {
  return rect.right > rect.left && rect.bottom > rect.top &&
    rect.right > viewport.left && rect.left < viewport.right &&
    rect.bottom > viewport.top && rect.top < viewport.bottom
}

/** DOM order is reading order in both layouts; inspect characters only on a play or resume action. */
export function firstVisibleSpeechAnchor(container: HTMLElement, viewport: SpeechViewport): { id: string; offset: number } | null {
  for (const element of container.querySelectorAll<HTMLElement>('[data-speech-id]')) {
    if (!speechRectIsVisible(element.getBoundingClientRect(), viewport)) continue
    if (element.tagName === 'SPAN' && !element.classList.contains('katex')) {
      for (const character of speechCharacters(element)) {
        const rect = typeof character.range.getBoundingClientRect === 'function'
          ? character.range.getBoundingClientRect() : element.getBoundingClientRect()
        if (speechRectIsVisible(rect, viewport)) return { id: element.dataset.speechId!, offset: character.offset }
      }
    } else if (speechRectIsVisible(speechElementRect(element), viewport)) {
      return { id: element.dataset.speechId!, offset: Number(element.dataset.speechOffset ?? 0) }
    }
  }
  return null
}
