import type { SpeechEvents, SpeechRequest, SpeechSynthesisPort } from './SpeechSynthesisPort'
import type { SpeechVoice } from './types'

/** Explicit injection fixture: native browser properties are never patched. */
export class FakeSpeechSynthesisPort implements SpeechSynthesisPort {
  supported = true
  voices: SpeechVoice[] = []
  status = { speaking: false, pending: false, paused: false }
  requests: { request: SpeechRequest; events: SpeechEvents }[] = []
  listeners = new Set<() => void>()
  cancelCount = 0
  pauseCount = 0
  resumeCount = 0
  statusReadCount = 0
  onCancel?: () => void
  isSupported() { return this.supported }
  getVoices() { return this.voices }
  getStatus() { this.statusReadCount++; return { ...this.status } }
  onVoicesChanged(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  setVoices(voices: SpeechVoice[]) { this.voices = voices; this.listeners.forEach(listener => listener()) }
  speak(request: SpeechRequest, events: SpeechEvents) {
    this.requests.push({ request, events })
    this.status = { speaking: false, pending: true, paused: this.status.paused }
  }
  pause() { this.pauseCount++; this.status.paused = true }
  resume() { this.resumeCount++; this.status.paused = false }
  cancel() {
    this.cancelCount++
    this.status = { speaking: false, pending: false, paused: this.status.paused }
    this.onCancel?.()
  }
  emitStart(index = this.requests.length - 1) {
    this.status = { speaking: true, pending: false, paused: false }
    this.requests[index].events.onStart()
  }
  emitEnd(index = this.requests.length - 1) {
    this.status = { speaking: false, pending: false, paused: false }
    this.requests[index].events.onEnd()
  }
  emitError(code: string, index = this.requests.length - 1) {
    this.status = { speaking: false, pending: false, paused: false }
    this.requests[index].events.onError(code)
  }
}
