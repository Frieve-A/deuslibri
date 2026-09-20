import { describe, expect, it } from 'vitest'
import {
  applyTateChuYokoToOrderedListMarkers,
  applyTateChuYokoToShortAlphanumerics,
  calculateTextSize,
  convertHeadingDigitsToFullWidth,
  getFontFamilyCSS,
  getPlainTextFromHtml,
  wrapKatexForVertical,
} from './utils'

const parse = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('reader content format utilities', () => {
  it('counts Japanese/full-width characters as two units and decodes supported HTML entities', () => {
    expect(calculateTextSize('AあＡ🙂')).toBe(6)
    expect(getPlainTextFromHtml('<p>A&nbsp;&amp;&lt;&gt;&quot;&#39;</p>')).toBe('A &<>"\'')
  })

  it('maps English Japanese-family preferences to Latin families while retaining Japanese choices otherwise', () => {
    expect(getFontFamilyCSS('mincho', 'en')).toContain('Times New Roman')
    expect(getFontFamilyCSS('gothic', 'en')).toContain('Arial')
    expect(getFontFamilyCSS('mincho', 'ja')).toContain('Yu Mincho')
    expect(getFontFamilyCSS('system')).toBe('inherit')
  })
})

describe('vertical KaTeX wrapping', () => {
  const katex = (tex: string) => `<span class="katex"><math><semantics><annotation encoding="application/x-tex">${tex}</annotation></semantics></math></span>`

  it('keeps short inline alphanumerics upright and rotates larger expressions', () => {
    const container = parse(wrapKatexForVertical(`<p>${katex('x')} ${katex('x+1')}</p>`))
    const islands = container.querySelectorAll('.math-island')
    expect(islands).toHaveLength(2)
    expect(islands[0].classList).toContain('math-short-island')
    expect((islands[0].querySelector('.katex') as HTMLElement).style.display).toBe('inline-block')
    const rotatable = islands[1].querySelector<HTMLElement>('.math-rotatable')
    expect(rotatable?.style.transform).toBe('rotate(90deg)')
    expect(rotatable?.dataset.needsMargin).toBe('true')
    expect((rotatable?.querySelector('.katex') as HTMLElement).style.display).toBe('block')
  })

  it('does not wrap table math or duplicate an existing math island', () => {
    const input = `<table><tr><td>${katex('x+1')}</td></tr></table><span class="math-island">${katex('y+2')}</span>`
    const container = parse(wrapKatexForVertical(input))
    expect(container.querySelector('table .math-island')).toBeNull()
    expect(container.querySelectorAll('.math-island')).toHaveLength(1)
    expect(container.querySelector('.math-island .math-island')).toBeNull()
  })
})

describe('vertical text normalization', () => {
  it('converts digits and dots only inside headings, including nested heading text', () => {
    const container = parse(convertHeadingDigitsToFullWidth('<h2>第12.章 <em>3</em></h2><p>12.3</p>'))
    expect(container.querySelector('h2')?.textContent).toBe('第１２．章 ３')
    expect(container.querySelector('p')?.textContent).toBe('12.3')
  })

  it('materializes ordered-list markers with start, value and marker type semantics', () => {
    const container = parse(applyTateChuYokoToOrderedListMarkers(
      '<ol type="A" start="2"><li><p>二</p></li><li value="27">二十七</li><li>二十八</li></ol>'
    ))
    expect(Array.from(container.querySelectorAll('.ordered-list-marker')).map(node => node.textContent)).toEqual(['B.', 'AA.', 'AB.'])
    expect(container.querySelector('ol')?.classList).toContain('vertical-ordered-list')
    expect(container.querySelector('li p')?.firstElementChild?.classList).toContain('ordered-list-marker')
    expect(container.querySelectorAll('.vertical-ordered-list-item')).toHaveLength(3)
  })

  it('is idempotent and honors reversed ordered lists', () => {
    const once = applyTateChuYokoToOrderedListMarkers('<ol reversed><li>三</li><li>二</li><li>一</li></ol>')
    const twice = parse(applyTateChuYokoToOrderedListMarkers(once))
    expect(Array.from(twice.querySelectorAll('.ordered-list-marker')).map(node => node.textContent)).toEqual(['3.', '2.', '1.'])
  })

  it('combines one or two alphanumerics in Japanese context and skips Latin runs and protected content', () => {
    const container = parse(applyTateChuYokoToShortAlphanumerics(
      '<p>第12章 A12B 第123章 <code>第9章</code><span class="katex">第8章</span></p>'
    ))
    expect(Array.from(container.querySelectorAll(':scope p > .tate-chu-yoko')).map(node => node.textContent)).toEqual(['12'])
    expect(container.querySelector('p')?.textContent).toContain('A12B 第123章')
    expect(container.querySelector('code .tate-chu-yoko')).toBeNull()
    expect(container.querySelector('.katex .tate-chu-yoko')).toBeNull()
  })

  it('recognizes Japanese context across inline element boundaries', () => {
    const container = parse(applyTateChuYokoToShortAlphanumerics('<p>第<strong>2</strong>章</p>'))
    expect(container.querySelector('strong > .tate-chu-yoko')?.textContent).toBe('2')
  })
})
