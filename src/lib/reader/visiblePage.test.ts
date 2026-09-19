import { describe, expect, it } from 'vitest'
import { resolveVisiblePage, type PageBounds } from './visiblePage'

const viewport = { left: 0, right: 1000, top: 80, bottom: 800 }
const page = (pageIndex: number, left: number, right: number, top = 80, bottom = 800): PageBounds => ({ pageIndex, left, right, top, bottom })

describe('logical page at the viewport reading edge', () => {
  it('uses the right inside edge in vertical-rl, independent of numeric scroll position', () => {
    expect(resolveVisiblePage([page(0, 1100, 1600), page(1, 600, 1100), page(2, 100, 600)], viewport, true)).toBe(1)
  })
  it('uses the top inside edge below the sticky header for horizontal text', () => {
    expect(resolveVisiblePage([page(0, 0, 1000, -400, 60), page(1, 0, 1000, 70, 600)], viewport, false)).toBe(1)
  })
  it('prefers the nearest intersecting start edge and keeps DOM order for ties', () => {
    expect(resolveVisiblePage([page(4, 700, 1100), page(2, 800, 1005)], viewport, true)).toBe(2)
    expect(resolveVisiblePage([page(4, 700, 1100), page(2, 700, 1100)], viewport, true)).toBe(4)
  })
  it('resolves dividers and nonintersecting wrappers by nearest physical distance', () => {
    expect(resolveVisiblePage([page(0, 1020, 1500), page(1, 400, 980)], viewport, true)).toBe(1)
    expect(resolveVisiblePage([page(0, 0, 1000, -300, 70), page(1, 0, 1000, 91, 400)], viewport, false)).toBe(0)
  })
  it('handles exact boundaries, zero-size layout, invalid layout and missing wrappers', () => {
    expect(resolveVisiblePage([page(0, 1000, 1500), page(1, 500, 1000)], viewport, true)).toBe(1)
    expect(resolveVisiblePage([page(0, 0, 0, 0, 0), page(1, 0, 0, 0, 0)], viewport, true)).toBe(0)
    expect(resolveVisiblePage([page(1, NaN, NaN)], viewport, true)).toBe(0)
    expect(resolveVisiblePage([], viewport, false)).toBe(0)
  })
})
