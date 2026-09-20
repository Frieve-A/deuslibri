import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAbsoluteUrl, getBasePath, getBaseUrl, getContentImagePath, getOriginUrl, withBasePath } from './basePath'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('base-path utilities', () => {
  it('derives a deployment path from the site URL and removes one trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test/library/')
    expect(getBaseUrl()).toBe('https://example.test/library/')
    expect(getBasePath()).toBe('/library')
    expect(withBasePath('content/file.png')).toBe('/library/content/file.png')
  })

  it('prefers the explicit legacy path and tolerates an invalid site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'not a URL')
    expect(getBasePath()).toBe('')
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/explicit')
    expect(getBasePath()).toBe('/explicit')
  })

  it('builds content image paths from Windows or POSIX book folders', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/base')
    expect(getContentImagePath('C:\\repo\\content\\books\\2026-09\\sample\\ja', './images/cover.jpg'))
      .toBe('/base/content/books/2026-09/sample/ja/images/cover.jpg')
    expect(getContentImagePath('/repo/content/books/2026-09/sample/en', 'images/cover.jpg'))
      .toBe('/base/content/books/2026-09/sample/en/images/cover.jpg')
  })

  it('combines the configured origin with an already based path', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test/library')
    expect(getOriginUrl()).toBe('https://example.test')
    expect(getAbsoluteUrl('library/book/a/ja')).toBe('https://example.test/library/book/a/ja')
  })
})
