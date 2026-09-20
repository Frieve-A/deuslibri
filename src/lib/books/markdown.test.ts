import { afterEach, describe, expect, it, vi } from 'vitest'
import { markdownToHtml } from './markdown'

afterEach(() => {
  vi.unstubAllEnvs()
})

function parseBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body
}

describe('markdown rendering contract', () => {
  it('renders GFM, CJK-adjacent emphasis, and semantic headings', async () => {
    const body = parseBody(await markdownToHtml('# 見出し\n\n**太字**直後と *斜体*直後\n\n- one\n- two'))
    expect(body.querySelector('h1')?.textContent).toBe('見出し')
    expect(body.querySelector('strong')?.textContent).toBe('太字')
    expect(body.querySelector('em')?.textContent).toBe('斜体')
    expect(Array.from(body.querySelectorAll('li'), (item) => item.textContent)).toEqual(['one', 'two'])
  })

  it('turns a captioned image into a figure, escapes attributes, and rewrites local image paths', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test/library/')
    const html = await markdownToHtml(
      '![A & B](./images/scene.png "T & T")\n\nCaption: <unsafe> & description',
      { bookFolderPath: 'C:\\repo\\content\\books\\2026-09\\fixture\\ja' }
    )
    const body = parseBody(html)
    const figure = body.querySelector('figure')
    const image = figure?.querySelector('img')
    expect(image?.getAttribute('src')).toBe('/library/content/books/2026-09/fixture/ja/images/scene.png')
    expect(image?.getAttribute('alt')).toBe('A & B')
    expect(image?.getAttribute('title')).toBe('T & T')
    expect(figure?.querySelector('figcaption')?.textContent).toBe('<unsafe> & description')
    expect(figure?.querySelector('figcaption')?.children).toHaveLength(0)
  })

  it('adds safe new-tab attributes to links and honors image suppression', async () => {
    const html = await markdownToHtml('[Example](https://example.test)\n\n![Alt](images/picture.webp)', {
      disableImages: true,
    })
    const body = parseBody(html)
    const link = body.querySelector('a')
    expect(link?.target).toBe('_blank')
    expect(link?.rel).toBe('noopener noreferrer')
    expect(body.querySelector('img')).toBeNull()
    expect(body.textContent).toContain('Example')
  })

  it('renders math with KaTeX or converts inline math to readable text when disabled', async () => {
    const enabled = parseBody(await markdownToHtml('Value $x^2 + \\alpha$'))
    expect(enabled.querySelector('.katex')).not.toBeNull()

    const disabled = parseBody(await markdownToHtml('Value $x^{2} + \\alpha + \\frac{1}{2}$', {
      disableMath: true,
    }))
    expect(disabled.querySelector('.katex')).toBeNull()
    expect(disabled.textContent).toContain('x² + α + 1/2')
  })

  it('preserves extra blank lines and applies delimiter-width table wrapping hints per column', async () => {
    const body = parseBody(await markdownToHtml(
      'First\n\n\nSecond\n\n| Label | Description |\n| ---------- | --- |\n| Short | A long value that wraps |'
    ))
    expect(body.querySelectorAll('.spacer')).toHaveLength(1)
    const rows = body.querySelectorAll('tr')
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      const cells = row.querySelectorAll('th, td')
      expect(cells[0].classList.contains('markdown-table-nowrap')).toBe(true)
      expect(cells[1].classList.contains('markdown-table-nowrap')).toBe(false)
    }
  })
})
