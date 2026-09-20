import { act, createElement } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DocumentRoot from './DocumentRoot'
import { useI18nStore } from '@/lib/i18n'

let root: Root | undefined
let testDocument: Document

function element(lang?: string) {
  return createElement(PathParamsContext.Provider, { value: lang ? { id: 'fixture', lang } : {} },
    createElement(DocumentRoot, null,
      createElement('head'),
      createElement('body', null, createElement('main', null, 'Fixture'))))
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  useI18nStore.getState().setLanguage('default')
  testDocument = document.implementation.createHTMLDocument('')
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  root = undefined
  useI18nStore.getState().setLanguage('default')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['ja', 'en', 'fr'])('exports the book language %s on html before hydration', lang => {
  useI18nStore.getState().setLanguage(lang === 'ja' ? 'en' : 'ja')
  expect(renderToString(element(lang))).toContain(`<html lang="${lang}">`)
})

it('follows book navigation and restores the selected UI language when leaving a book', async () => {
  useI18nStore.getState().setLanguage('ja')
  root = createRoot(testDocument)
  await act(async () => root!.render(element('ja')))
  expect(testDocument.documentElement.lang).toBe('ja')
  await act(async () => root!.render(element('en')))
  expect(testDocument.documentElement.lang).toBe('en')
  await act(async () => root!.render(element()))
  expect(testDocument.documentElement.lang).toBe('ja')
  await act(async () => useI18nStore.getState().setLanguage('en'))
  expect(testDocument.documentElement.lang).toBe('en')
})

it('keeps the book language when the UI preference changes', async () => {
  root = createRoot(testDocument)
  await act(async () => root!.render(element('ja')))
  await act(async () => useI18nStore.getState().setLanguage('en'))
  expect(testDocument.documentElement.lang).toBe('ja')
})

it.each([
  ['ja-JP', 'ja'], ['fr-FR', 'en'],
])('hydrates the exported UI page for browser %s without a mismatch', async (browserLanguage, expected) => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage)
  const html = renderToString(element())
  expect(html).toContain('<html lang="en">')
  testDocument.open()
  testDocument.write('<!DOCTYPE html>' + html)
  testDocument.close()
  const onRecoverableError = vi.fn()
  await act(async () => { root = hydrateRoot(testDocument, element(), { onRecoverableError }) })
  expect(testDocument.documentElement.lang).toBe(expected)
  expect(onRecoverableError).not.toHaveBeenCalled()
})

it('hydrates a Japanese book with ja already present in the exported HTML', async () => {
  const html = renderToString(element('ja'))
  testDocument.open()
  testDocument.write('<!DOCTYPE html>' + html)
  testDocument.close()
  expect(testDocument.documentElement.lang).toBe('ja')
  const onRecoverableError = vi.fn()
  await act(async () => { root = hydrateRoot(testDocument, element('ja'), { onRecoverableError }) })
  expect(testDocument.documentElement.lang).toBe('ja')
  expect(onRecoverableError).not.toHaveBeenCalled()
})
