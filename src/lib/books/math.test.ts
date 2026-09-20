import { describe, expect, it } from 'vitest'
import { convertInlineMathToUnicode } from './math'

describe('plain-text inline math conversion', () => {
  it('converts representative scripts, fractions, symbols, and functions', () => {
    expect(convertInlineMathToUnicode('x^{2} + a_{10} = \\frac{1}{2} \\times \\alpha; \\sin(x)'))
      .toBe('x² + a₁₀ = 1/2 × α; sin(x)')
  })

  it('keeps readable text from common text-style commands and normalizes spacing', () => {
    expect(convertInlineMathToUnicode('  \\text{speed} \\quad \\mathbf{x}  ')).toBe('speed x')
  })

  it('does not discard unknown commands or their readable payload', () => {
    expect(convertInlineMathToUnicode('\\unknown{value}')).toBe('\\unknownvalue')
  })
})
