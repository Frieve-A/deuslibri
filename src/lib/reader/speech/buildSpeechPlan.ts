import { convertInlineMathToUnicode } from '../../books/math'
import { canonicalSpeechLanguage, normalizeSpeechLanguage } from './selectVoice'
import type { SpeechSegment, SpeechSegmentKind } from './types'

export const SPEECH_CHUNK_LENGTH = 280
export const SPEECH_MATH_LENGTH = 80
const normalizeSpace = (text: string) => text.replace(/\s+/gu, ' ').trim()

/** Prefer sentence boundaries, then commas/whitespace; preserve short atomic phrases.
 * An indivisible URL or bracketed phrase may exceed the target length. This avoids
 * changing its meaning just to meet an arbitrary browser-independent target.
 */
export function splitSpeechText(text: string, limit = SPEECH_CHUNK_LENGTH): string[] {
  const value = normalizeSpace(text)
  if (!value) return []
  const maximum = Math.max(2, Math.floor(limit) || SPEECH_CHUNK_LENGTH)
  const characters = Array.from(value)
  const protectedCuts = new Set<number>()
  // Offsets use code points, so no cut can bisect a surrogate pair.
  const protect = (start: number, end: number) => {
    for (let i = start + 1; i < end; i++) protectedCuts.add(i)
  }
  for (const match of value.matchAll(/https?:\/\/[^\s<>]+|www\.[^\s<>]+|\b(?:[A-Za-z]\.){2,}|\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)\.|\b\d+(?:\.\d+)+/g)) {
    const start = Array.from(value.slice(0, match.index)).length
    protect(start, start + Array.from(match[0]).length)
  }
  const pairs: Record<string, string> = { '(': ')', '（': '）', '[': ']', '「': '」', '『': '』', '【': '】', '“': '”' }
  const stack: { start: number; close: string }[] = []
  characters.forEach((char, i) => {
    if (pairs[char]) stack.push({ start: i, close: pairs[char] })
    else if (stack.at(-1)?.close === char) {
      const bracket = stack.pop()!
      protect(bracket.start, i + 1)
    }
  })
  const result: string[] = []
  let start = 0
  while (start < characters.length) {
    if (characters.length - start <= maximum) {
      result.push(characters.slice(start).join('').trim())
      break
    }
    let sentence = -1
    let phrase = -1
    let safe = -1
    for (let cut = start + 1; cut <= Math.min(start + maximum, characters.length); cut++) {
      if (protectedCuts.has(cut)) continue
      safe = cut
      const before = characters[cut - 1]
      const after = characters[cut]
      if (/[。！？!?]/u.test(before) || (before === '.' && (!after || /\s/u.test(after)))) sentence = cut
      else if (/[、,;；\s]/u.test(before)) phrase = cut
    }
    let end = sentence > start ? sentence : phrase > start ? phrase : safe
    if (end <= start) {
      end = start + maximum
      while (end < characters.length && protectedCuts.has(end)) end++
    }
    const chunk = characters.slice(start, end).join('').trim()
    if (chunk) result.push(chunk)
    start = end
  }
  return result.filter(Boolean)
}

const excludedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP', 'TEMPLATE', 'RP', 'RT'])
function excluded(element: Element, allowReadingTag = false): boolean {
  const style = element.getAttribute('style') ?? ''
  return (excludedTags.has(element.tagName.toUpperCase()) && !(allowReadingTag && element.tagName === 'RT')) || element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden')?.toLowerCase() === 'true' ||
    /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))(?:\s*!important)?\s*(?:;|$)/i.test(style) ||
    element.matches('.spacer, .gradient, .donation, .donate, .purchase, [data-speech-ignore]')
}

function elementLanguage(element: Element, inherited: string): string {
  const lang = element.getAttribute('lang') ?? element.getAttribute('xml:lang')
  return lang ? canonicalSpeechLanguage(lang) ?? inherited : inherited
}

function mathText(element: Element, lang: string): string {
  const fallback = lang.startsWith('ja') ? '数式' : 'Formula'
  const tex = element.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim()
  if (!tex || tex.length > SPEECH_MATH_LENGTH || /\\(?:begin|end|newcommand|def|html|href|includegraphics)\b/.test(tex)) return fallback
  // The display converter replaces command prefixes. Reject unknown complete
  // commands here instead of changing its established display behavior.
  const textCommands = new Set(['text', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit', 'frac', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'lim', 'max', 'min'])
  for (const match of tex.matchAll(/\\([A-Za-z]+)/g)) {
    if (!textCommands.has(match[1]) && /[\\A-Za-z]/.test(convertInlineMathToUnicode(match[0]))) return fallback
  }
  const plain = convertInlineMathToUnicode(tex)
  return plain && plain.length <= SPEECH_MATH_LENGTH && !/[\\{}<>^_]/.test(plain) ? plain : fallback
}

/** Parse detached semantic HTML. Never mutate rendered reader DOM or persist text. */
export function buildSpeechPlan(pageHtml: string, pageIndex: number, defaultLang: string, annotate?: (html: string) => void): SpeechSegment[] {
  const document = new DOMParser().parseFromString(pageHtml, 'text/html')
  const segments: SpeechSegment[] = []
  let blockIndex = 0
  let chunkIndex = 0
  let pending = ''
  let source: Node | null = null
  let origins: { node: Node | null; offset: number }[] = []
  const marks = new Map<Text, { start: number; end: number; id: string; offset: number }[]>()
  let pendingLang = normalizeSpeechLanguage(defaultLang)
  let pendingKind: SpeechSegmentKind = 'paragraph'
  const flush = () => {
    // Keep normalized spoken characters tied to their original DOM text positions.
    const normalized: { char: string; node: Node | null; offset: number }[] = []
    for (let i = 0; i < pending.length; i++) {
      const char = /\s/u.test(pending[i]) ? ' ' : pending[i]
      if (char === ' ' && (!normalized.length || normalized.at(-1)?.char === ' ')) continue
      normalized.push({ char, ...origins[i] })
    }
    if (normalized.at(-1)?.char === ' ') normalized.pop()
    const value = normalized.map(item => item.char).join('')
    let searchFrom = 0
    for (const text of splitSpeechText(value)) {
      const id = 'speech-' + pageIndex + '-' + blockIndex + '-' + chunkIndex++
      segments.push({ id, pageIndex, blockIndex, text, lang: pendingLang, kind: pendingKind })
      const start = value.indexOf(text, searchFrom)
      searchFrom = start + text.length
      if (!annotate) continue
      const chars = normalized.slice(start, searchFrom)
      for (let i = 0; i < chars.length;) {
        const first = chars[i]
        let end = i + 1
        while (end < chars.length && chars[end].node === first.node) end++
        if (first.node?.nodeType === 3) {
          const node = first.node as Text
          const list = marks.get(node) ?? []
          list.push({ start: first.offset, end: chars[end - 1].offset + 1, id, offset: i })
          marks.set(node, list)
        } else if (first.node?.nodeType === 1) {
          const element = first.node as Element
          if (!element.hasAttribute('data-speech-id')) {
            element.setAttribute('data-speech-id', id)
            element.setAttribute('data-speech-offset', String(i))
          }
        }
        i = end
      }
    }
    pending = ''
    origins = []
  }
  const boundary = () => { flush(); blockIndex++; chunkIndex = 0 }
  const append = (text: string, lang: string, kind: SpeechSegmentKind) => {
    if (pendingLang !== lang || pendingKind !== kind) flush()
    pendingLang = lang
    pendingKind = kind
    pending += text
    for (let offset = 0; offset < text.length; offset++) origins.push({ node: source, offset })
  }
  const walk = (node: Node, inheritedLang: string, inheritedKind: SpeechSegmentKind) => {
    if (node.nodeType === 3) { source = node; append(node.textContent ?? '', inheritedLang, inheritedKind); return }
    if (node.nodeType !== 1) return
    const element = node as Element
    source = element
    if (excluded(element)) return
    const lang = elementLanguage(element, inheritedLang)
    const tag = element.tagName.toUpperCase()
    if (element.classList.contains('katex')) {
      append(` ${mathText(element, lang)} `, lang, 'math')
      flush()
      return
    }
    if (tag === 'MATH' || element.classList.contains('katex-html') || element.classList.contains('katex-mathml')) return
    if (tag === 'BR') { append(' ', lang, inheritedKind); return }
    if (tag === 'IMG') {
      const figure = element.closest('figure')
      const caption = figure?.querySelector('figcaption')
      if (caption && !excluded(caption) && normalizeSpace(caption.textContent ?? '')) return
      const alt = normalizeSpace(element.getAttribute('alt') ?? '')
      if (alt) append(` ${lang.startsWith('ja') ? '画像、' : 'Image, '}${alt} `, lang, inheritedKind)
      return
    }
    if (tag === 'RUBY') {
      // Each rt replaces only the base characters that precede it; unannotated
      // trailing text and empty readings preserve their original base characters.
      let base: Node[] = []
      const readBase = () => { base.forEach(child => walk(child, lang, inheritedKind)); base = [] }
      for (const child of Array.from(element.childNodes)) {
        const childElement = child.nodeType === 1 ? child as Element : null
        if (childElement?.tagName === 'RP') continue
        if (childElement?.tagName === 'RT') {
          const reading = normalizeSpace(childElement.textContent ?? '')
          if (reading && !excluded(childElement, true)) {
            source = element
            append(reading, elementLanguage(childElement, lang), inheritedKind)
            base = []
          } else readBase()
        } else base.push(child)
      }
      readBase()
      return
    }
    const kinds: Record<string, SpeechSegmentKind> = {
      H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
      P: inheritedKind === 'quote' || inheritedKind === 'list-item' ? inheritedKind : 'paragraph',
      LI: 'list-item', BLOCKQUOTE: 'quote', TR: 'table-row', FIGCAPTION: 'caption', CAPTION: 'caption',
    }
    const kind = kinds[tag] ?? inheritedKind
    const isBlock = !!kinds[tag] || ['DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'TABLE', 'FIGURE', 'HR'].includes(tag)
    const followsListNumber = tag === 'P' && element.parentElement?.tagName === 'LI' && /^-?\d+\.\s*$/.test(pending)
    if (isBlock && !followsListNumber) boundary()
    if (tag === 'LI' && element.parentElement?.tagName === 'OL') {
      const list = element.parentElement
      const items = Array.from(list.children).filter(child => child.tagName === 'LI')
      const reversed = list.hasAttribute('reversed')
      let ordinal = Number(list.getAttribute('start') ?? (reversed ? items.length : 1))
      for (const item of items) {
        if (item.hasAttribute('value')) ordinal = Number(item.getAttribute('value'))
        if (item === element) break
        ordinal += reversed ? -1 : 1
      }
      if (Number.isFinite(ordinal)) append(`${ordinal}. `, lang, kind)
    }
    for (const child of Array.from(element.childNodes)) walk(child, lang, kind)
    source = element
    if (tag === 'TH' || tag === 'TD') append(' ', lang, kind)
    if (isBlock) boundary()
  }
  const rootLang = elementLanguage(document.documentElement, normalizeSpeechLanguage(defaultLang))
  walk(document.body, rootLang, 'paragraph')
  flush()
  if (annotate) {
    for (const [node, ranges] of marks) {
      const fragment = document.createDocumentFragment()
      let offset = 0
      for (const range of ranges) {
        fragment.append(node.data.slice(offset, range.start))
        const span = document.createElement('span')
        span.dataset.speechId = range.id
        span.dataset.speechOffset = String(range.offset)
        span.textContent = node.data.slice(range.start, range.end)
        fragment.append(span)
        offset = range.end
      }
      fragment.append(node.data.slice(offset))
      node.replaceWith(fragment)
    }
    annotate(document.body.innerHTML)
  }
  return segments
}
