import { act, createElement, StrictMode, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useSpeechSynthesis, type UseSpeechSynthesisOptions } from './useSpeechSynthesis'
import { FakeSpeechSynthesisPort } from '@/lib/reader/speech/FakeSpeechSynthesisPort'
import { DEFAULT_SPEECH_SETTINGS } from '@/lib/reader/speech/types'

it('wires the hook lifecycle once under StrictMode and cleans up pagehide, visibility and voice listeners', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const port = new FakeSpeechSynthesisPort()
  const options: UseSpeechSynthesisOptions = {
    port, pages: [[{ id: 'p0', pageIndex: 0, blockIndex: 0, text: '本文', lang: 'ja-JP', kind: 'paragraph' }]],
    language: 'ja', settings: DEFAULT_SPEECH_SETTINGS, contextKey: 'book-ja-vertical', onNavigate: vi.fn(),
  }
  let current: ReturnType<typeof useSpeechSynthesis> | undefined
  function Harness() {
    const speech = useSpeechSynthesis(options)
    useLayoutEffect(() => { current = speech })
    return createElement('button', { onClick: () => speech.start(0) }, speech.status)
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(StrictMode, null, createElement(Harness))) })
    expect(port.listeners.size).toBe(1)
    expect(current?.status).toBe('loadingVoices')
    expect(port.requests).toHaveLength(0)
    await act(async () => {
      port.setVoices([{ voiceURI: 'ja', name: 'Japanese', lang: 'ja-JP', localService: true, default: true }])
    })
    expect(current?.status).toBe('ready')
    await act(async () => { container.querySelector('button')!.click() })
    expect(port.requests).toHaveLength(1)
    expect(current?.status).toBe('playing')
    await act(async () => { window.dispatchEvent(new Event('pagehide')) })
    expect(current?.status).toBe('ready')
    await act(async () => { port.emitEnd(0) })
    expect(port.requests).toHaveLength(1)
    await act(async () => { root.unmount() })
    expect(port.listeners.size).toBe(0)
    const cancelCount = port.cancelCount
    window.dispatchEvent(new Event('pagehide'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(port.cancelCount).toBe(cancelCount)
    expect(port.statusReadCount).toBe(0)
  } finally {
    container.remove()
    vi.unstubAllGlobals()
  }
})
