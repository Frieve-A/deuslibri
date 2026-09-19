import { describe, expect, it } from 'vitest'
import { buildSpeechPlan, splitSpeechText, SPEECH_CHUNK_LENGTH } from './buildSpeechPlan'
import { convertInlineMathToUnicode } from '../../books/math'
import { markdownToHtml } from '../../books/markdown'

const texts = (html: string, lang = 'ja') => buildSpeechPlan(html, 2, lang).map(segment => segment.text)

describe('semantic speech plan', () => {
  it('keeps DOM order, entities, paragraphs, and visible link labels', () => {
    const result = buildSpeechPlan('<h2>第12章</h2><p>A&nbsp; &amp;\n B <a href="https://secret.example">label</a></p><blockquote><p>引用</p></blockquote>', 3, 'ja')
    expect(result.map(({ text, kind, lang }) => ({ text, kind, lang }))).toEqual([
      { text: '第12章', kind: 'heading', lang: 'ja-JP' },
      { text: 'A & B label', kind: 'paragraph', lang: 'ja-JP' },
      { text: '引用', kind: 'quote', lang: 'ja-JP' },
    ])
    expect(result.every(segment => segment.pageIndex === 3)).toBe(true)
  })

  it('reads ruby pronunciation once, preserves empty readings and unannotated tails', () => {
    expect(texts('<p><ruby>東<rt>とう</rt>京<rt>きょう</rt></ruby>へ<ruby>行<rp>(</rp><rt>い</rt><rp>)</rp>く</ruby>。<ruby>文字<rt> </rt></ruby></p>'))
      .toEqual(['とうきょうへいく。文字'])
  })

  it('ignores hidden text, controls, spacer and code subtrees', () => {
    expect(texts('<p>本文<span hidden>hidden</span><span aria-hidden="true">marker</span><span style="display: none !important">hide</span><span style="visibility:hidden">hide</span><code>code</code></p><pre>x</pre><kbd>key</kbd><samp>sample</samp><script>bad()</script><style>bad</style><button>buy</button><svg><text>icon</text></svg><div class="spacer">space</div><div class="donation">donate</div>'))
      .toEqual(['本文'])
  })

  it('uses caption once, alt only without caption, and ignores empty alt', () => {
    expect(texts('<figure><img alt="duplicate"><figcaption>図の説明</figcaption></figure><p><img alt="風景"><img alt=""></p>'))
      .toEqual(['図の説明', '画像、風景'])
    expect(texts('<img alt="Landscape">', 'en')).toEqual(['Image, Landscape'])
  })

  it('reads nested lists and table cells in DOM order, numbering only once', () => {
    expect(texts('<ol start="3"><li><span aria-hidden="true">3.</span>親<ul><li>子</li></ul>続き</li><li value="8">次</li></ol><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'))
      .toEqual(['3. 親', '子', '続き', '8. 次', 'A B', '1 2'])
  })

  it('honors nested valid language changes and ignores invalid lang', () => {
    const result = buildSpeechPlan('<p>日本語<span lang="EN-gb">English <i lang="invalid!">words</i></span>戻る</p>', 0, 'ja')
    expect(result.map(({ text, lang }) => [text, lang])).toEqual([
      ['日本語', 'ja-JP'], ['English words', 'en-GB'], ['戻る', 'ja-JP'],
    ])
  })

  it('reads KaTeX annotations once and falls back for complex/unknown math', async () => {
    const html = await markdownToHtml('Value $x^2 + \\alpha$ and $\\frac{1}{2}$.\n\n$$\\begin{matrix}a & b\\end{matrix}$$')
    const result = texts(html, 'en')
    expect(result).toEqual(['Value', 'x² + α', 'and', '1/2', '.', 'Formula'])
    expect(texts('<span class="katex"><annotation encoding="application/x-tex">\\unknown{a}</annotation><span>duplicate</span></span>')).toEqual(['数式'])
  })

  it('keeps original math-disabled markdown conversion after extraction', async () => {
    expect(convertInlineMathToUnicode('x^{2} + \\alpha + \\frac{1}{2}')).toBe('x² + α + 1/2')
    const html = await markdownToHtml('Value $x^{2} + \\alpha + \\frac{1}{2}$', { disableMath: true })
    expect(texts(html, 'en')).toEqual(['Value x² + α + 1/2'])
  })

  it('makes deterministic, unique page-local IDs without modifying input markup', () => {
    const html = '<p>same</p><p>same</p>'
    const first = buildSpeechPlan(html, 0, 'en')
    expect(buildSpeechPlan(html, 0, 'en')).toEqual(first)
    expect(new Set(first.map(segment => segment.id)).size).toBe(first.length)
    expect(buildSpeechPlan(html, 1, 'en')[0].id).not.toBe(first[0].id)
    expect(texts('<div style="writing-mode:vertical-rl">' + html + '</div>', 'en')).toEqual(first.map(segment => segment.text))
    expect(html).toBe('<p>same</p><p>same</p>')
  })

  it('returns no segments for empty or excluded pages', () => {
    expect(texts('<p> \n </p><img alt=""><pre>ignored</pre>')).toEqual([])
  })

  it('handles paired rb elements and hidden ruby readings without dropping base text', () => {
    expect(texts('<ruby><rb>東</rb><rb>京</rb><rt>とう</rt><rt>きょう</rt></ruby>'))
      .toEqual(['とうきょう'])
    expect(texts('<ruby>親<rt style="display:none">隠れた読み</rt></ruby>')).toEqual(['親'])
  })

  it('keeps a list number with its first paragraph', () => {
    expect(texts('<ol><li><p>First</p><p>Second</p></li></ol>', 'en')).toEqual(['1. First', 'Second'])
  })

  it('does not treat a known command prefix as a supported math command', () => {
    expect(texts('<span class="katex"><annotation encoding="application/x-tex">\\input{a}</annotation></span>')).toEqual(['数式'])
  })
})

describe('conservative chunking', () => {
  it('prefers sentence punctuation before commas and respects the target', () => {
    expect(splitSpeechText('最初の文。次の文章、まだ続きます。終わり。', 15)).toEqual(['最初の文。', '次の文章、まだ続きます。', '終わり。'])
    const result = splitSpeechText('あ'.repeat(1000))
    expect(result.join('')).toBe('あ'.repeat(1000))
    expect(result.every(text => Array.from(text).length <= SPEECH_CHUNK_LENGTH)).toBe(true)
  })

  it('keeps URLs, decimals, abbreviations, parentheses and surrogate pairs intact', () => {
    for (const atom of ['https://example.org/a.b?q=3.14', '3.14159', 'U.S.A.', '(one two three)']) {
      const result = splitSpeechText(`Start ${atom} End.`, 12)
      expect(result.some(text => text.includes(atom))).toBe(true)
    }
    const emoji = splitSpeechText('😀'.repeat(600), 17)
    expect(emoji.join('')).toBe('😀'.repeat(600))
    expect(emoji.every(text => !/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/.test(text))).toBe(true)
    expect(splitSpeechText('   ')).toEqual([])
  })
})


it('annotates rendered chunks while preserving visible markup and speech semantics', () => {
  const html = '<h2>Heading 12</h2><p>' + 'A long sentence. '.repeat(50) + '<ruby>東京<rt>とうきょう</rt></ruby><em> end</em></p><pre>ignored</pre>'
  let annotated = ''
  const plan = buildSpeechPlan(html, 2, 'ja', value => { annotated = value })
  expect(plan).toEqual(buildSpeechPlan(html, 2, 'ja'))
  const source = new DOMParser().parseFromString(html, 'text/html')
  const rendered = new DOMParser().parseFromString(annotated, 'text/html')
  expect(rendered.body.textContent).toBe(source.body.textContent)
  expect(rendered.querySelector('ruby')?.textContent).toBe('東京とうきょう')
  expect(rendered.querySelector('pre [data-speech-id]')).toBeNull()
  for (const segment of plan) expect(rendered.querySelector('[data-speech-id="' + segment.id + '"]')).not.toBeNull()
})
