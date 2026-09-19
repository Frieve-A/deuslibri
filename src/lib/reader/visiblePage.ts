export interface PageBounds {
  pageIndex: number
  left: number
  right: number
  top: number
  bottom: number
}

export interface ReaderScrollTarget {
  element: HTMLElement | Window
  position: number
  maxPosition: number
  scrollTo(position: number): void
}

/** The reader has four layouts; movement, end detection, and listeners share this mapping. */
export function resolveReaderScrollTarget(container: HTMLElement | null, vertical: boolean, pagination: boolean): ReaderScrollTarget | null {
  if (!container) return null
  if (!vertical && !pagination) {
    return {
      element: window,
      position: window.scrollY,
      maxPosition: Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight),
      scrollTo: top => window.scrollTo({ top, behavior: 'instant' }),
    }
  }
  const element = vertical && pagination ? container.firstElementChild as HTMLElement | null : container
  if (!element) return null
  return {
    element,
    position: vertical ? -element.scrollLeft : element.scrollTop,
    maxPosition: Math.max(0, vertical ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight),
    scrollTo: position => element.scrollTo(vertical ? { left: -position, behavior: 'instant' } : { top: position, behavior: 'instant' }),
  }
}

/** Resolve DOM-order pages at the logical reading edge, independently of scrollLeft conventions. */
export function resolveVisiblePage(pages: readonly PageBounds[], viewport: Omit<PageBounds, 'pageIndex'>, vertical: boolean): number {
  const edge = vertical ? viewport.right - 0.5 : viewport.top + 0.5
  let winner = 0
  let bestIntersection = false
  let bestDistance = Infinity
  for (const page of pages) {
    const start = vertical ? page.left : page.top
    const end = vertical ? page.right : page.bottom
    if (![start, end].every(Number.isFinite)) continue
    const crosses = vertical
      ? page.bottom > viewport.top && page.top < viewport.bottom
      : page.right > viewport.left && page.left < viewport.right
    const intersects = crosses && start <= edge && end >= edge && end > start
    const distance = intersects
      ? Math.abs((vertical ? page.right : page.top) - edge)
      : Math.max(start - edge, edge - end, 0)
    if ((intersects && !bestIntersection) || (intersects === bestIntersection && distance < bestDistance)) {
      winner = page.pageIndex
      bestIntersection = intersects
      bestDistance = distance
    }
  }
  return winner
}

export function getVisibleReaderPage(container: HTMLElement | null, vertical: boolean): number {
  if (!container) return 0
  const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
  const viewport = vertical ? container.getBoundingClientRect() : {
    left: 0, right: window.innerWidth, top: Math.max(0, headerBottom), bottom: window.innerHeight,
  }
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[id^="scroll-page-"]')).map(element => ({
    pageIndex: Number(element.id.slice('scroll-page-'.length)),
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    top: element.getBoundingClientRect().top,
    bottom: element.getBoundingClientRect().bottom,
  })).filter(page => Number.isInteger(page.pageIndex))
  return resolveVisiblePage(pages, viewport, vertical)
}
