/**
 * Convert LaTeX commands to Unicode characters for plain text display
 */
const latexToUnicode: Record<string, string> = {
  // Greek letters
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\varepsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\varphi': 'φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\omega': 'ω',
  '\\Gamma': 'Γ',
  '\\Delta': 'Δ',
  '\\Theta': 'Θ',
  '\\Lambda': 'Λ',
  '\\Xi': 'Ξ',
  '\\Pi': 'Π',
  '\\Sigma': 'Σ',
  '\\Phi': 'Φ',
  '\\Psi': 'Ψ',
  '\\Omega': 'Ω',
  // Operators and symbols
  '\\cdot': '·',
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\mp': '∓',
  '\\leq': '≤',
  '\\le': '≤',
  '\\geq': '≥',
  '\\ge': '≥',
  '\\neq': '≠',
  '\\ne': '≠',
  '\\approx': '≈',
  '\\sim': '∼',
  '\\simeq': '≃',
  '\\cong': '≅',
  '\\equiv': '≡',
  '\\propto': '∝',
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\sum': '∑',
  '\\prod': '∏',
  '\\int': '∫',
  '\\oint': '∮',
  '\\sqrt': '√',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\supset': '⊃',
  '\\subseteq': '⊆',
  '\\supseteq': '⊇',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\emptyset': '∅',
  '\\varnothing': '∅',
  '\\land': '∧',
  '\\lor': '∨',
  '\\neg': '¬',
  '\\lnot': '¬',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\Leftrightarrow': '⇔',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\leftrightarrow': '↔',
  '\\uparrow': '↑',
  '\\downarrow': '↓',
  '\\mapsto': '↦',
  '\\ldots': '…',
  '\\cdots': '⋯',
  '\\vdots': '⋮',
  '\\ddots': '⋱',
  '\\prime': '′',
  '\\degree': '°',
  '\\circ': '°',
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\parallel': '∥',
  '\\triangle': '△',
  '\\square': '□',
  '\\diamond': '◇',
  '\\star': '★',
  '\\bullet': '•',
  '\\dagger': '†',
  '\\ddagger': '‡',
  // Spacing (convert to appropriate space or remove)
  '\\,': ' ',
  '\\;': ' ',
  '\\:': ' ',
  '\\!': '',
  '\\quad': '  ',
  '\\qquad': '    ',
  '\\ ': ' ',
  // Common functions (keep as text)
  '\\sin': 'sin',
  '\\cos': 'cos',
  '\\tan': 'tan',
  '\\log': 'log',
  '\\ln': 'ln',
  '\\exp': 'exp',
  '\\lim': 'lim',
  '\\max': 'max',
  '\\min': 'min',
}

/**
 * Convert inline LaTeX math to Unicode plain text
 * Removes $, {}, \text{} and converts LaTeX commands to Unicode
 */
export function convertInlineMathToUnicode(latex: string): string {
  let result = latex

  // Handle \text{...} - extract the text content
  result = result.replace(/\\text\{([^}]*)\}/g, '$1')
  result = result.replace(/\\textbf\{([^}]*)\}/g, '$1')
  result = result.replace(/\\textit\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathrm\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathbf\{([^}]*)\}/g, '$1')
  result = result.replace(/\\mathit\{([^}]*)\}/g, '$1')

  // Handle superscripts: ^{...} or ^x
  result = result.replace(/\^{([^}]*)}/g, (_, content) => {
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ',
    }
    return content.split('').map((c: string) => superscripts[c] || c).join('')
  })
  result = result.replace(/\^([0-9n])/g, (_, c) => {
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ',
    }
    return superscripts[c] || c
  })

  // Handle subscripts: _{...} or _x
  result = result.replace(/_{([^}]*)}/g, (_, content) => {
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
      'i': 'ᵢ', 'j': 'ⱼ', 'n': 'ₙ', 'm': 'ₘ',
    }
    return content.split('').map((c: string) => subscripts[c] || c).join('')
  })
  result = result.replace(/_([0-9])/g, (_, c) => {
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    }
    return subscripts[c] || c
  })

  // Handle fractions: \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')

  // Convert LaTeX commands to Unicode (sort by length to match longer commands first)
  const sortedCommands = Object.keys(latexToUnicode).sort((a, b) => b.length - a.length)
  for (const cmd of sortedCommands) {
    result = result.split(cmd).join(latexToUnicode[cmd])
  }

  // Remove remaining curly braces
  result = result.replace(/[{}]/g, '')

  // Clean up extra whitespace
  result = result.replace(/\s+/g, ' ').trim()

  return result
}
