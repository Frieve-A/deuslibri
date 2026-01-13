# Vertical Writing Mode Technical Specification

## Overview

This document defines the technical specification for vertical writing mode (`writing-mode: vertical-rl`) used for Japanese books, including in-page scrolling and page navigation behavior.

**IMPORTANT**: This specification is documented to prevent confusion about the relationship between `scrollLeft` values and visible content positions.

## Basic Concepts

### 1. Vertical Writing Mode (vertical-rl)

- Uses CSS `writing-mode: vertical-rl`
- Text flows vertically and progresses right-to-left
- Corresponds to traditional Japanese reading direction

### 2. Reading Direction

```
┌─────────────────────────────────┐
│                    ↓ Text       │
│  End    ↓ Text      ↓ Text      │
│  of     ↓ Text      ↓ Text      │
│  read   ↓ Text                  │
│  ing                Start       │
│                     of          │
│                     reading     │
│                                 │
│  ← ← ← ← ← ← ← ← ← ← ← ← ← ←  │
│  Reading direction (R to L)     │
└─────────────────────────────────┘
```

- **Reading start**: Right edge content
- **Reading progression**: Right to left
- **Reading end**: Left edge content

## scrollLeft Behavior (Firefox Standard)

### Critical Understanding

`scrollLeft` indicates the **scroll position**, which has an **inverse relationship** with the **visible content position**.

### scrollLeft Value Range

```
scrollLeft value range:
  0 (minimum) ←→ -maxScroll (maximum)

maxScroll = scrollWidth - clientWidth
```

### Relationship Between scrollLeft and Visible Content

| scrollLeft Value | Scroll Position | Visible Content | Reading State |
|-----------------|----------------|-----------------|---------------|
| `0` | Scroll area **left edge** | **Right edge** content | **Reading start** (initial) |
| `-100` | Scroll area middle | Center content | Reading |
| `-maxScroll` (e.g., -201) | Scroll area **right edge** | **Left edge** content | **Reading end** |

### Visual Understanding

```
Internal structure of scroll area:

When scrollLeft = 0:
┌─────────[Display Window]────────┐
│ Right content | Center | Left   │
│ (Start)       |        | (Hidden)│
└─────────────────────────────────┘
↑
Scroll position at left edge

When scrollLeft = -201:
┌─────────────────────────────────┐
│ Right    | Center | Left content│
│ (Hidden) |        | (End)        │
└─────────[Display Window]────────┘
                                  ↑
                    Scroll position at right edge
```

## Edge Detection Logic

### Variable Naming Convention

```typescript
// These variables indicate "which content is visible"
isAtRightEdgeContentRef.current  // Right edge content is visible = reading start
isAtLeftEdgeContentRef.current   // Left edge content is visible = reading end
```

### Edge Detection Implementation

```typescript
const edgeThreshold = 50 // Threshold in pixels
const scrollLeft = prose.scrollLeft
const maxScroll = scrollableWidth - visibleWidth

// Is right edge content visible? (reading start position)
// scrollLeft close to 0 = scroll position at left = right edge content visible
isAtRightEdgeContentRef.current = scrollLeft >= -edgeThreshold

// Is left edge content visible? (reading end position)
// scrollLeft close to -maxScroll = scroll position at right = left edge content visible
isAtLeftEdgeContentRef.current = scrollLeft <= -(maxScroll - edgeThreshold)
```

### Detection Examples (when maxScroll = 201)

| scrollLeft | isAtRightEdgeContent | isAtLeftEdgeContent | State |
|-----------|---------------------|---------------------|-------|
| `0` | `true` (0 >= -50) | `false` (0 > -151) | Right edge content visible (start) |
| `-50` | `true` (-50 >= -50) | `false` | Near right edge content |
| `-51` | `false` | `false` | Center (scrolling) |
| `-150` | `false` | `false` | Center (scrolling) |
| `-151` | `false` | `true` (-151 <= -151) | Near left edge content |
| `-201` | `false` | `true` (-201 <= -151) | Left edge content visible (end) |

## Page Navigation and Scroll Integration

### Basic Principles

1. **When scroll space exists within page**: Scroll within page first
2. **Only when at content edge**: Allow page navigation via swipe or tap

### Input Methods

There are three input methods for navigation:

1. **Tap/Click**: Quick touch/click without movement (< 10px movement)
2. **Swipe**: Touch with significant movement (> 50px movement)
3. **Keyboard**: Arrow keys for navigation

---

### Keyboard Navigation

Arrow keys provide 80% scroll within page, with page navigation at edges.

#### Vertical Mode (Japanese)

| Key | Scroll Space Available | At Edge |
|-----|----------------------|---------|
| **← Left / ↓ Down** | Scroll 80% toward left (reading end) | Go to Next page |
| **→ Right / ↑ Up** | Scroll 80% toward right (reading start) | Go to Prev page |

#### Horizontal Mode

| Key | Scroll Space Available | At Edge |
|-----|----------------------|---------|
| **↓ Down / → Right** | Scroll down 80% | Go to Next page |
| **↑ Up / ← Left** | Scroll up 80% | Go to Prev page |

#### Scroll Mode (Infinite Scroll)

In scroll mode (non-pagination), keyboard navigation scrolls 80% of visible area without page transitions:

| Mode | Key | Action |
|------|-----|--------|
| Vertical scroll | ← Left / ↓ Down | Scroll 80% left |
| Vertical scroll | → Right / ↑ Up | Scroll 80% right |
| Horizontal scroll | ↓ Down / → Right | Scroll 80% down |
| Horizontal scroll | ↑ Up / ← Left | Scroll 80% up |

**Note**: Browser default scroll behavior is prevented (`e.preventDefault()`) to ensure consistent 80% scroll amounts.

---

### Tap Navigation

Tap allows quick navigation by tapping on the left or right side of the screen.

**Note**: Tap navigation can be disabled in Settings → Interaction Settings. There are separate toggles for:
- Click/tap to scroll (within page scrolling)
- Click/tap to turn page (page navigation)

#### Tap Behavior

| Tap Location | Scroll Space Available | At Edge |
|--------------|----------------------|---------|
| **Right side** | Scroll 80% toward right (reading start) | Go to Prev page |
| **Left side** | Scroll 80% toward left (reading end) | Go to Next page |

#### Tap Detection

```typescript
const isTap = touchEndX === 0 || Math.abs(swipeDistance) < 10
```

#### Tap Implementation

```typescript
if (isTap && isVertical) {
  const tapX = touchStartX.current
  const elementCenter = rect.left + rect.width / 2
  const scrollAmount = rect.width * 0.8  // 80% of visible width

  const currentScrollLeft = prose.scrollLeft
  const maxScroll = prose.scrollWidth - prose.clientWidth

  // Edge detection
  const isAtRightEdge = currentScrollLeft >= -edgeThreshold  // scrollLeft ≈ 0
  const isAtLeftEdge = currentScrollLeft <= -(maxScroll - edgeThreshold)

  if (tapX > elementCenter) {
    // Right side tap
    if (isAtRightEdge) {
      goToPrevPage()
    } else {
      // Scroll toward right (increase scrollLeft toward 0)
      prose.scrollTo({ left: currentScrollLeft + scrollAmount, behavior: 'smooth' })
    }
  } else {
    // Left side tap
    if (isAtLeftEdge) {
      goToNextPage()
    } else {
      // Scroll toward left (decrease scrollLeft toward -maxScroll)
      prose.scrollTo({ left: currentScrollLeft - scrollAmount, behavior: 'smooth' })
    }
  }
}
```

#### Tap Flowchart

```
┌─────────────────────────────────────┐
│ User taps screen (< 10px movement)  │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Determine tap location              │
│ (left or right of center)           │
└───────────┬─────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
[Right side]    [Left side]
    │               │
    ▼               ▼
┌─────────┐    ┌─────────┐
│At right │    │At left  │
│edge?    │    │edge?    │
└────┬────┘    └────┬────┘
  Yes│No         Yes│No
    │ │           │ │
    ▼ ▼           ▼ ▼
 Prev Scroll   Next Scroll
 Page Right    Page Left
```

---

### Swipe Navigation

Swipe allows page navigation only when at content edge.

**Note**: Swipe/flick page navigation can be disabled in Settings → Interaction Settings.

#### Swipe Operation Definition

```typescript
const swipeDistance = touchStartX - touchEndX
// swipeDistance < 0: Right swipe (swipe to right)
// swipeDistance > 0: Left swipe (swipe to left)
```

#### Page Navigation Logic

```typescript
// Left edge content visible + right swipe → Next page (continue reading)
if (swipeDistance < 0 && isAtLeftEdgeContentRef.current) {
  goToNextPage()
}

// Right edge content visible + left swipe → Previous page (go back)
if (swipeDistance > 0 && isAtRightEdgeContentRef.current) {
  goToPrevPage()
}
```

#### Swipe Flowchart

```
┌─────────────────────────────────────┐
│ User swipes (> 50px movement)       │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Check edge state at touch start     │
└───────────┬─────────────────────────┘
            │
            ▼
    ┌───────┴───────┐
    │               │
    ▼               ▼
[Edge state]    [Center state]
    │               │
    │               └→ Do nothing
    │                  (Browser handles
    │                   scroll)
    │
    ▼
┌─────────────────────────────────────┐
│ Check swipe direction and edge      │
└───────────┬─────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
[Left edge      [Right edge
 content]        content]
+ Right swipe   + Left swipe
    │               │
    ▼               ▼
  Next Page      Prev Page
 (Continue)      (Go back)
```

## Scroll Position on Page Navigation

### Key Principle: scrollLeft Value vs Visible Content

**CRITICAL**: The relationship between `scrollLeft` values and visible content is **counter-intuitive**:

| scrollLeft Value | Visible Content | When to Use |
|------------------|-----------------|-------------|
| `0` | **RIGHT edge** (reading START) | Next page, initial load |
| `-maxScroll` | **LEFT edge** (reading END) | Prev page |

### Why This Matters

When implementing scroll position on page change:
- **Next operation**: User wants to start reading from the beginning → Show RIGHT edge → `scrollLeft = 0`
- **Prev operation**: User wants to continue from where they left off → Show LEFT edge → `scrollLeft = -maxScroll`

### Implementation

```typescript
// CORRECT implementation
if (direction === 'prev') {
  // Prev: show LEFT edge (reading end = where user left off)
  prose.scrollLeft = -maxScroll  // NOT 0!
} else {
  // Next/initial: show RIGHT edge (reading start)
  prose.scrollLeft = 0  // NOT -maxScroll!
}
```

### Common Mistake (DO NOT DO THIS)

```typescript
// WRONG - this is backwards!
if (direction === 'prev') {
  prose.scrollLeft = 0  // WRONG: shows RIGHT edge, not LEFT
} else {
  prose.scrollLeft = -maxScroll  // WRONG: shows LEFT edge, not RIGHT
}
```

### Layout Timing Considerations

When using `dangerouslySetInnerHTML`, the content may not be fully laid out immediately. You must wait for layout to stabilize before setting scroll position:

```typescript
useEffect(() => {
  if (!loading && isVertical && contentRef.current && isPagination) {
    const direction = navigationDirectionRef.current
    navigationDirectionRef.current = null

    // Poll until scrollWidth stabilizes
    let attempts = 0
    const maxAttempts = 50  // 500ms max
    let lastScrollWidth = 0

    const checkAndScroll = () => {
      const prose = contentRef.current?.firstElementChild as HTMLElement
      if (!prose) return

      const currentScrollWidth = prose.scrollWidth

      // Wait if layout is still changing
      if (currentScrollWidth !== lastScrollWidth && attempts < maxAttempts) {
        lastScrollWidth = currentScrollWidth
        attempts++
        setTimeout(checkAndScroll, 10)
        return
      }

      // Layout stable - now set scroll position
      const maxScroll = prose.scrollWidth - prose.clientWidth
      if (direction === 'prev') {
        prose.scrollLeft = -maxScroll  // Show LEFT edge
      } else {
        prose.scrollLeft = 0  // Show RIGHT edge
      }
    }

    setTimeout(checkAndScroll, 10)
  }
}, [currentPage, loading, isVertical, isPagination])
```

## HTML/CSS Structure

### DOM Structure

```html
<div ref={contentRef} class="overflow-x-auto">
  <!-- ↑ Container: defines scrollable area -->

  <div class="prose" style="writing-mode: vertical-rl">
    <!-- ↑ Actual scrolling element: use this element's scrollLeft -->

    <!-- Content -->
  </div>
</div>
```

### Critical Implementation Points

1. **contentRef vs prose element**
   - `contentRef`: Outer container (`overflow-x-auto`)
   - `prose`: Inner element that actually scrolls
   - **Target for scrollLeft**: `prose` element (`contentRef.firstElementChild`)

2. **Style Settings**
   ```css
   .prose[style*="writing-mode: vertical-rl"] {
     height: 100% !important;
     box-sizing: border-box;
   }
   ```

## Typography and Spacing

### Design Principle: Logical Properties in Vertical Mode

In `writing-mode: vertical-rl`, CSS logical properties map differently to physical properties:

| Logical Property | Horizontal Mode | Vertical Mode |
|------------------|-----------------|---------------|
| `margin-block` (top/bottom) | Physical top/bottom | Physical **left/right** |
| `margin-inline` (left/right) | Physical left/right | Physical **top/bottom** |

Since Tailwind's `.prose` class uses physical margin-top/bottom properties, vertical mode requires explicit horizontal margins for proper spacing between elements.

### Block Element Margins

#### Vertical Mode (Japanese)

All block elements need `margin-left` and `margin-right` instead of `margin-top` and `margin-bottom`:

```css
/* Paragraphs */
.prose[style*="writing-mode: vertical-rl"] p {
  margin-left: 1.25em !important;
  margin-right: 0 !important;
}

/* Headings */
.prose[style*="writing-mode: vertical-rl"] h1,
.prose[style*="writing-mode: vertical-rl"] h2,
/* ... h3-h6 ... */ {
  margin-left: 1.5em !important;
  margin-right: 0.5em !important;
}

/* Lists, Code blocks, Blockquotes */
.prose[style*="writing-mode: vertical-rl"] pre,
.prose[style*="writing-mode: vertical-rl"] ol,
.prose[style*="writing-mode: vertical-rl"] ul,
.prose[style*="writing-mode: vertical-rl"] blockquote {
  margin-left: 1.25em !important;
  margin-right: 0.5em !important;
}
```

#### Horizontal Mode

Horizontal mode also requires explicit margins to ensure consistent spacing:

```css
.prose[style*="writing-mode: horizontal-tb"] p {
  margin-top: 1.25em !important;
  margin-bottom: 0 !important;
}

.prose[style*="writing-mode: horizontal-tb"] h1,
/* ... h2-h6 ... */ {
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
}

.prose[style*="writing-mode: horizontal-tb"] pre,
.prose[style*="writing-mode: horizontal-tb"] ol,
.prose[style*="writing-mode: horizontal-tb"] ul,
.prose[style*="writing-mode: horizontal-tb"] blockquote {
  margin-top: 1.25em !important;
  margin-bottom: 0.5em !important;
}
```

### Image Layout

#### Problem: Images in Paragraphs

When Markdown images are followed by captions on the next line without a blank line:

```markdown
![Description](./images/image.jpg)
*Caption text*
```

This generates HTML where `<img>` and `<em>` are in the same `<p>` tag:

```html
<p><img src="..."><em>Caption text</em></p>
```

In vertical mode, this causes the caption to appear next to the image instead of below it (in reading order).

#### Solution: Flex Container for Image Paragraphs

```css
/* Image paragraphs use flex to separate image and caption */
.prose[style*="writing-mode: vertical-rl"] p:has(img) {
  display: flex !important;
  flex-direction: column !important;  /* In vertical-rl, column = horizontal stacking */
  align-items: center !important;
  margin-left: 1.5rem !important;
  margin-right: 1.5rem !important;
}

.prose[style*="writing-mode: vertical-rl"] img {
  /* Use container query units for responsive sizing relative to prose container */
  /* In vertical-rl mode, image "height" maps to horizontal, "width" to vertical */
  max-height: 70cqw !important;  /* 70% of container width */
  max-width: 90cqh !important;   /* 90% of container height */
  height: auto !important;
  width: auto !important;
  object-fit: contain;
}
```

**Container Query Setup**:

The prose container must have `container-type: size` to enable container query units:

```typescript
<div
  className="h-full overflow-x-scroll"
  style={{
    containerType: 'size', /* Enable container query units for image sizing */
  }}
>
```

**Why `flex-direction: column` works in vertical mode**:
- In `writing-mode: vertical-rl`, the logical "column" direction maps to the physical horizontal direction
- This causes flex items (image and caption) to be stacked left-to-right, which matches the reading progression

### Preserving Multiple Blank Lines

#### Problem: Standard Markdown Ignores Extra Blank Lines

Standard Markdown parsers treat multiple consecutive blank lines as a single paragraph break:

```markdown
Paragraph 1.



Paragraph 2.  (3 blank lines are ignored)
```

Outputs:
```html
<p>Paragraph 1.</p>
<p>Paragraph 2.</p>
```

#### Solution: Pre-process Blank Lines into Spacer Elements

The `markdownToHtml` function converts extra blank lines into spacer markers before parsing:

```typescript
// Pre-process: Convert multiple consecutive blank lines to spacer markers
const SPACER_MARKER = ':::SPACER:::'
let processedMarkdown = markdown.replace(/\n(\n{2,})/g, (_match, blanks) => {
  const extraLines = blanks.length - 1
  return '\n\n' + (SPACER_MARKER + '\n\n').repeat(extraLines)
})

// Post-process: Convert markers to spacer divs
html = html.replace(
  /<p>:::SPACER:::<\/p>/g,
  '<div class="spacer" aria-hidden="true"></div>'
)
```

#### Spacer Element Styling

```css
/* Horizontal mode: vertical spacing */
.prose .spacer {
  display: block;
  height: 1em;
}

/* Vertical mode: horizontal spacing */
.prose[style*="writing-mode: vertical-rl"] .spacer {
  height: auto;
  width: 1em;
  min-width: 1em;
}
```

#### Usage in Markdown

Authors can add extra visual spacing by using multiple blank lines:

```markdown
End of scene.



Beginning of new scene.  (3 blank lines = 2 spacers)
```

This creates visible gaps in the rendered output, useful for scene breaks or dramatic pauses.

## Troubleshooting

### Common Confusion Points

#### 1. "Is scrollLeft = 0 the right edge or left edge?"

**Answer**: scrollLeft = 0 is the **left edge of scroll position**, but this shows **right edge content**.

- Scroll position: Left edge
- Visible content: Right edge
- Reading state: Reading start

#### 2. "Is it right swipe or left swipe for Next?"

**Answer**: When **left edge content is visible**, **right swipe** triggers **Next**.

- Left edge content visible = reading end position
- Right swipe = reading progression direction
- Next = advance to next page

#### 3. "Aren't the variable names backwards?"

Variable names are based on **visible content**:

- `isAtRightEdgeContentRef` = right edge content is visible
- `isAtLeftEdgeContentRef` = left edge content is visible

This is the inverse of scrollLeft values, but correct from the user's perspective.

#### 4. "What scrollLeft value should I set for Prev/Next page navigation?"

**Answer**: Think about what the **user wants to see**:

| Operation | User expects to see | scrollLeft value |
|-----------|---------------------|------------------|
| Next page | Start of new page (RIGHT edge) | `0` |
| Prev page | Where they left off (LEFT edge) | `-maxScroll` |

**Memory aid**:
- `0` = "zero" = "start from scratch" = RIGHT edge (reading start)
- `-maxScroll` = "maximum negative" = "furthest along" = LEFT edge (reading end)

#### 5. "My scroll position is being set but shows wrong content"

Check these in order:

1. **Timing**: Is the content fully rendered? Use polling to wait for `scrollWidth` to stabilize
2. **Target element**: Are you setting `scrollLeft` on the correct element (`prose`, not `contentRef`)?
3. **Value direction**: Remember `0` shows RIGHT, `-maxScroll` shows LEFT (counter-intuitive!)

#### 6. "Prose element overflows the container vertically"

**Problem**: In `writing-mode: vertical-rl`, CSS `height` and `max-height` properties are ignored and overridden by content height. This causes the prose element to overflow its parent container.

**Root Cause**: When `writing-mode: vertical-rl` is applied, the physical height of the element is determined by the text content (line length in vertical writing), not by CSS height specifications. Standard CSS properties like `height: 100%`, `max-height`, and even `overflow: hidden` on the parent do not constrain the element's physical height.

**Solution**: Use JavaScript to programmatically set the height with `!important`:

```typescript
useEffect(() => {
  if (!loading && isVertical && contentRef.current && isPagination) {
    const container = contentRef.current
    const prose = container.firstElementChild as HTMLElement
    if (prose) {
      const containerHeight = container.clientHeight
      // Use setProperty with !important to override content-based height
      prose.style.setProperty('height', `${containerHeight}px`, 'important')
      prose.style.setProperty('max-height', `${containerHeight}px`, 'important')
      prose.style.overflow = 'hidden'
    }
  }
}, [loading, isVertical, isPagination, currentPage])
```

**Why CSS alone doesn't work**:
- `h-full` (height: 100%) → Ignored, content height takes precedence
- `max-height: 100%` → Ignored in vertical-rl mode
- `overflow-y: hidden` on parent → Child still renders beyond bounds
- `display: flex` with `align-items: stretch` → Does not constrain physical height in vertical-rl

**Why JavaScript with !important works**:
- `style.setProperty('height', value, 'important')` forces the height value
- Combined with `overflow: hidden` on the prose element itself, content is clipped

#### 7. "Touch drag doesn't scroll in vertical mode"

**Problem**: After adding long-press text selection support, touch drag no longer scrolls the content horizontally in vertical writing mode.

**Root Cause**: Two issues combined:
1. The prose element had `overflow: hidden` which disabled scrolling
2. Browser's native touch scrolling was blocked

**Solution**:

1. **Enable horizontal scrolling on prose element**:
```typescript
useEffect(() => {
  if (!loading && isVertical && contentRef.current && isPagination) {
    const prose = container.firstElementChild as HTMLElement
    if (prose) {
      // Enable horizontal scroll for vertical writing mode
      prose.style.overflowX = 'auto'
      prose.style.overflowY = 'hidden'
    }
  }
}, [loading, isVertical, isPagination, currentPage])
```

2. **Add `touch-action: pan-x` to container**:
```tsx
<div
  ref={contentRef}
  style={{
    touchAction: 'pan-x', /* Enable horizontal touch scroll */
  }}
>
```

**Why `touch-action: pan-x`**:
- Tells browser to handle horizontal panning natively
- Works with `overflow-x: auto` on the scrollable element
- Long-press text selection still works (not blocked by touch-action)

#### 8. "Scroll position jumps back after saving in scroll mode"

**Problem**: In vertical infinite scroll mode, scroll position flickers or jumps back to a specific position after user interaction. The position keeps reverting to an old value (e.g., 5304) even after scrolling to a new position.

**Root Cause**: Using `useReadingStore()` without selectors subscribes to the entire store. When `setProgress` updates the `progress` state:
1. Component re-renders due to store subscription
2. `dangerouslySetInnerHTML` content is rebuilt
3. Scroll position is reset to the value before the update
4. This creates a "ping-pong" effect where new positions are saved but immediately reset

**Solution**: Use Zustand selectors to subscribe only to specific state slices, and use `getState()` for actions that update `progress`:

```typescript
// WRONG - subscribes to entire store, causes re-render on progress update
const { settings, setProgress, isFavorite, ... } = useReadingStore()

// CORRECT - subscribe only to needed state
const settings = useReadingStore((state) => state.settings)
const isFavorite = useReadingStore((state) => state.isFavorite)
const addFavorite = useReadingStore((state) => state.addFavorite)
// ... other selectors for needed state

// For setProgress, use getState() to avoid subscription
useReadingStore.getState().setProgress(bookId, language, page, scrollPosition)
```

**Additional measures**:
1. Use `isSmoothScrollingRef` flag to suppress scroll saving during programmatic smooth scrolls
2. After smooth scroll completes, manually save the final position

```typescript
// During smooth scroll
isSmoothScrollingRef.current = true
element.scrollBy({ left: scrollAmount, behavior: 'smooth' })

// After scroll animation completes
setTimeout(() => {
  isSmoothScrollingRef.current = false
  const finalPos = element.scrollLeft
  useReadingStore.getState().setProgress(bookId, language, page, finalPos)
}, 500)
```

**Why this works**:
- Selectors prevent re-render when `progress` changes (only re-render when selected state changes)
- `getState()` accesses current state without creating a subscription
- The component doesn't re-render when saving progress, so scroll position is preserved

## Heading Digit Conversion for Vertical Mode

### Overview

In vertical Japanese text, full-width digits look more natural than half-width digits, especially in headings. The `convertHeadingDigitsToFullWidth()` function converts half-width digits and dots to full-width characters within heading elements (h1-h6).

### Implementation

Located in `src/lib/reader/utils.ts`:

```typescript
const toFullWidthForVertical = (str: string): string => {
  return str.replace(/[0-9.]/g, (char) => {
    if (char === '.') {
      return '．' // Full-width dot
    }
    return String.fromCharCode(char.charCodeAt(0) + 0xFEE0)
  })
}

export const convertHeadingDigitsToFullWidth = (html: string): string => {
  // ... DOM parsing and text node processing
}
```

### Conversion Examples

| Original | Converted |
|----------|-----------|
| `1.1 Introduction` | `１．１ Introduction` |
| `Chapter 2.3` | `Chapter ２．３` |
| `Section 10` | `Section １０` |

### Usage

Applied during HTML pre-processing in `ReaderContent.tsx`:

```typescript
const processedPageHtml = useMemo(() => {
  if (!isVertical) {
    return pageHtml
  }
  return pageHtml.map((html) => {
    let processed = wrapKatexForVertical(html)
    processed = convertHeadingDigitsToFullWidth(processed)
    return processed
  })
}, [pageHtml, isVertical])
```

---

## Link Handling

### External Links Open in New Tab

All links in book content are modified to open in a new tab for better reading experience. This is done in `src/lib/books/markdown.ts`:

```typescript
html = html.replace(
  /<a href="([^"]+)"(?![^>]*target=)/g,
  '<a href="$1" target="_blank" rel="noopener noreferrer"'
)
```

### Link Click Navigation Bypass

When clicking/tapping on links, the normal page navigation (scroll/page change) is bypassed to allow browser's native link handling:

**Mouse (useMouseNavigation.ts)**:
```typescript
const linkElement = target.closest('a')
clickedOnLinkRef.current = linkElement !== null && linkElement.hasAttribute('href')
if (clickedOnLinkRef.current) {
  return // Don't prevent default - allow browser to handle link click
}
```

**Touch (useTouchNavigation.ts)**:
```typescript
const linkElement = touchTarget.closest('a')
touchedOnLinkRef.current = linkElement !== null && linkElement.hasAttribute('href')
if (touchedOnLinkRef.current) {
  return // Don't interfere with link tap
}
```

---

## KaTeX Math Rendering in Vertical Mode

### Overview

KaTeX-rendered mathematical expressions need special handling in vertical writing mode (`vertical-rl`) because:
1. Math expressions are inherently horizontal (left-to-right)
2. They must be rotated 90° to align with vertical text flow
3. Rotation changes the element's bounding box, requiring margin adjustments

### Three-Layer Wrapper Structure

Each KaTeX element is wrapped in a three-layer structure:

```html
<span class="math-island" style="writing-mode: horizontal-tb; display: inline-block;">
  <span class="math-rotatable" style="transform: rotate(90deg); display: inline-block;">
    <span class="katex" style="display: block;">
      <!-- KaTeX content -->
    </span>
  </span>
</span>
```

**Layer purposes**:
1. **math-island**: Isolates the math from vertical parent context with `writing-mode: horizontal-tb`
2. **math-rotatable**: Applies 90° rotation and holds margin adjustments
3. **katex**: The original KaTeX element, set to `display: block`

### Implementation: Pre-processing HTML

The wrapper structure is applied via `wrapKatexForVertical()` in `src/lib/reader/utils.ts`:

```typescript
export const wrapKatexForVertical = (html: string): string => {
  if (typeof document === 'undefined') {
    return html // Server-side, return unchanged
  }

  const container = document.createElement('div')
  container.innerHTML = html

  const katexElements = container.querySelectorAll('.katex')
  katexElements.forEach((katex) => {
    if (katex.closest('table')) return // Skip KaTeX in tables
    if (katex.closest('.math-island')) return // Already wrapped

    const island = document.createElement('span')
    island.className = 'math-island'
    island.style.writingMode = 'horizontal-tb'
    island.style.display = 'inline-block'

    const rotatable = document.createElement('span')
    rotatable.className = 'math-rotatable'
    rotatable.style.display = 'inline-block'
    rotatable.style.transform = 'rotate(90deg)'
    rotatable.style.transformOrigin = 'center center'
    rotatable.dataset.needsMargin = 'true'

    katex.parentNode?.insertBefore(island, katex)
    island.appendChild(rotatable)
    rotatable.appendChild(katex)
    ;(katex as HTMLElement).style.display = 'block'
  })

  return container.innerHTML
}
```

**Why pre-process at HTML level**:
- Wrapping must survive React re-renders
- `dangerouslySetInnerHTML` replaces DOM on each render
- Pre-processing ensures wrapper structure is part of the HTML string

### Margin Adjustment with useLayoutEffect

After rotation, the element's visual bounds change. A square element stays the same, but rectangular elements need margin compensation:

```
Before rotation:     After rotation:
┌─────────────┐      ┌───┐
│ width=100   │  →   │   │ (now 100px tall)
│ height=50   │      │   │
└─────────────┘      │   │
                     └───┘ (now 50px wide)
```

**Margin calculation**:
```typescript
const diff = width - height
marginLeft = -diff / 2   // Negative margins pull element inward
marginRight = -diff / 2
marginTop = diff / 2     // Positive margins push outward
marginBottom = diff / 2
```

**Critical: useLayoutEffect, not useEffect**

Margin adjustment MUST use `useLayoutEffect` with no dependency array:

```typescript
useLayoutEffect(() => {
  if (!isVertical) return

  const container = contentRef.current
  if (!container) return

  const rotatables = container.querySelectorAll('.math-rotatable') as NodeListOf<HTMLElement>

  // Force reflow to get accurate measurements
  if (rotatables.length > 0) {
    container.offsetHeight
  }

  rotatables.forEach((rotatable) => {
    const katex = rotatable.querySelector('.katex') as HTMLElement
    if (!katex) return

    const width = katex.offsetWidth
    const height = katex.offsetHeight
    const diff = width - height

    rotatable.style.marginLeft = `${-diff / 2}px`
    rotatable.style.marginRight = `${-diff / 2}px`
    rotatable.style.marginTop = `${diff / 2}px`
    rotatable.style.marginBottom = `${diff / 2}px`
  })

  // Signal completion and show content
  proseElement.style.opacity = '1'
  window.dispatchEvent(new CustomEvent('katex-rotation-complete'))
}) // No dependency array - runs on every render
```

**Why useLayoutEffect without dependencies**:

| Approach | Problem |
|----------|---------|
| `useEffect` with deps | Runs after paint → user sees un-margined state briefly |
| `useLayoutEffect` with deps | React re-renders after effect, DOM replaced, margins lost |
| `useLayoutEffect` without deps | Runs synchronously before every paint, margins always applied |

**Root cause of the bug**:
1. React renders component with `dangerouslySetInnerHTML`
2. `useEffect` runs, applies margins
3. Some state change triggers React re-render
4. `dangerouslySetInnerHTML` replaces DOM, losing margin styles
5. Margins are gone until next effect run

**Solution**:
- `useLayoutEffect` blocks painting until complete
- No dependency array means it runs on every render
- Even if React re-renders and replaces DOM, margins are reapplied before user sees anything

### Content Visibility Control

Content is initially hidden (`opacity: 0`) and only shown after KaTeX processing is complete:

```typescript
// In ReaderContent.tsx
<div
  className="prose"
  style={{ opacity: isVertical ? 0 : 1 }}
  dangerouslySetInnerHTML={{ __html: processedPageHtml[currentPage] }}
/>
```

The `useLayoutEffect` sets `opacity: 1` after margins are applied, and dispatches `katex-rotation-complete` event for scroll restoration to proceed.

### Event: katex-rotation-complete

This custom event signals that KaTeX processing is complete:

```typescript
window.dispatchEvent(new CustomEvent('katex-rotation-complete'))
```

**Consumers**:
- `useBookProgress.ts`: Waits for this event before restoring scroll position
- This prevents scroll restoration from happening before layout is stable

### Test Verification

The implementation can be verified using the Playwright test in `test-katex.mjs`:

```bash
node test-katex.mjs
```

**Expected results**:
- All KaTeX elements wrapped in `.math-island`
- All `.math-rotatable` elements have `rotate(90deg)` transform
- All `.math-rotatable` elements have margin adjustments applied
- Prose element has `opacity: 1`

## Implementation Files

### Main Files

The BookReader functionality is split into modular components and hooks:

1. **src/components/BookReader.tsx**
   - Main component orchestrating all reader functionality
   - Uses custom hooks for state management and event handling

2. **src/components/reader/**
   - `ReaderHeader.tsx` - Header UI (title, bookmarks, share buttons)
   - `ReaderContent.tsx` - Content display (vertical/horizontal, pagination/scroll)
   - `PageNavigation.tsx` - Page navigation UI and progress bar

3. **src/hooks/**
   - `useBookProgress.ts` - Reading progress management (save/restore)
   - `usePageNavigation.ts` - Page navigation and keyboard handling
   - `useTouchNavigation.ts` - Touch event handling (swipe, tap, long-press)
   - `useMouseNavigation.ts` - Mouse event handling (click, drag selection)
   - `useProgressBar.ts` - Progress bar drag interactions
   - `useVerticalLayout.ts` - Vertical mode layout management
   - `useAutoScroll.ts` - Auto-scroll functionality (speed control, page turn)

4. **src/lib/reader/**
   - `constants.ts` - Configuration constants (thresholds, durations)
   - `utils.ts` - Utility functions (text size calculation, selection detection)

5. **src/app/globals.css** (lines 110-144)
   - Vertical mode CSS adjustments
   - Image size control

### Related State Management

```typescript
// src/lib/stores/useReadingStore.ts
settings.writingMode // 'horizontal' | 'vertical'
settings.displayMode // 'pagination' | 'scroll'
```

## Test Cases

### Manual Test Scenarios

#### Scenario 1: Normal In-Page Scrolling

1. Open book in vertical mode
2. Start reading from right edge of page
3. Swipe right slowly → Page scrolls left
4. Can read to left edge of content

**Expected**: No page navigation, scroll only

#### Scenario 2: Next Page After Reading End

1. Read to left edge of page (scrollLeft ≈ -maxScroll)
2. Swipe right quickly (50px+)

**Expected**: Navigate to next page

#### Scenario 3: Previous Page at Reading Start

1. At right edge of page (scrollLeft ≈ 0)
2. Swipe left quickly (50px+)

**Expected**: Navigate to previous page

#### Scenario 4: Content Fits on Screen

1. Open page where content fits screen width
2. Can swipe left or right

**Expected**: Left swipe = Prev, Right swipe = Next

#### Scenario 5: Tap to Scroll Within Page

1. Open page with content wider than screen
2. Page shows right edge content (reading start)
3. Tap on left side of screen

**Expected**: Scroll 80% toward left (reading progression), NOT page navigation

#### Scenario 6: Tap at Edge to Navigate

1. Scroll to left edge of page (reading end)
2. Tap on left side of screen

**Expected**: Navigate to next page

#### Scenario 7: Tap Right Side to Go Back

1. At right edge of page (scrollLeft ≈ 0)
2. Tap on right side of screen

**Expected**: Navigate to previous page

## Summary

### Key Points

1. **scrollLeft is inverse of display position**: `scrollLeft = 0` shows right edge content
2. **Variable names use user perspective**: Named by content position
3. **Page navigation only at edges**: Scroll only in center
4. **Consistent with reading direction**: Right swipe to continue reading (Next)

### Terminology Reference

| Term | Meaning | scrollLeft Value |
|------|---------|-----------------|
| Right edge content | Reading start section | ≈ 0 |
| Left edge content | Reading end section | ≈ -maxScroll |
| Right swipe | Reading progression | swipeDistance < 0 |
| Left swipe | Go back | swipeDistance > 0 |

---

## Horizontal Pagination Mode

While this document primarily covers vertical writing mode, horizontal pagination mode also supports tap navigation.

### Content Area Height

The content area is constrained to prevent overlap with the fixed navigation bar:

```typescript
style={isPagination ? { height: 'calc(100vh - 180px)' } : undefined}
```

- `180px` accounts for header (~100px) and footer navigation (~80px)
- `overflow-y-auto` enables vertical scrolling within the constrained area

### Tap Navigation (Horizontal Mode)

Tap anywhere on the content area to scroll or navigate:

```typescript
if (isTap && !isVertical && settings.displayMode === 'pagination') {
  const element = contentRef.current
  if (element) {
    const scrollAmount = element.clientHeight * 0.8  // 80% of visible height
    const edgeThreshold = 5
    const currentScrollTop = element.scrollTop
    const maxScroll = element.scrollHeight - element.clientHeight
    const isAtBottom = currentScrollTop >= maxScroll - edgeThreshold

    if (isAtBottom) {
      goToNextPage()
    } else {
      element.scrollTo({ top: currentScrollTop + scrollAmount, behavior: 'smooth' })
    }
  }
}
```

### Horizontal Mode Tap Behavior

Tap location determines scroll direction, similar to vertical mode's left/right tap:

| Tap Location | Scroll Space Available | At Edge |
|--------------|----------------------|---------|
| **Top half** | Scroll up 80% of visible height | Go to Prev page |
| **Bottom half** | Scroll down 80% of visible height | Go to Next page |

### Horizontal Mode Swipe Behavior

Vertical swipes at content edges trigger page navigation:

| Condition | Swipe Direction | Action |
|-----------|-----------------|--------|
| At top of page | Swipe down (pull down) | Go to Prev page |
| At bottom of page | Swipe up (pull up) | Go to Next page |
| Not at edge | Any swipe | Browser handles scroll |

### Scroll Position on Page Change (Horizontal Mode)

When navigating between pages, scroll position is set based on navigation direction:

| Operation | Scroll Position | Rationale |
|-----------|-----------------|-----------|
| Next page | Top (scrollTop = 0) | Start reading from beginning |
| Prev page | Bottom (scrollTop = maxScroll) | Continue from where user left off |

This mirrors the vertical mode behavior where Prev shows the left edge (reading end).

### Test Scenarios (Horizontal Mode)

#### Scenario H1: Tap Bottom Half to Scroll Down

1. Open book in horizontal pagination mode
2. Content is longer than visible area
3. Tap on bottom half of screen

**Expected**: Scroll down 80% of visible height

#### Scenario H2: Tap Top Half to Scroll Up

1. Scroll down partway through page
2. Tap on top half of screen

**Expected**: Scroll up 80% of visible height

#### Scenario H3: Tap at Bottom to Navigate Next

1. Scroll to bottom of current page
2. Tap on bottom half of screen

**Expected**: Navigate to next page, scroll position resets to top

#### Scenario H4: Tap at Top to Navigate Prev

1. At top of page (scrollTop ≈ 0)
2. Tap on top half of screen

**Expected**: Navigate to previous page, scroll position set to bottom

#### Scenario H5: Swipe Up at Bottom to Navigate Next

1. Scroll to bottom of current page
2. Swipe up (finger moves from bottom to top, > 50px)

**Expected**: Navigate to next page

#### Scenario H6: Swipe Down at Top to Navigate Prev

1. At top of page (scrollTop ≈ 0)
2. Swipe down (finger moves from top to bottom, > 50px)

**Expected**: Navigate to previous page, scroll position set to bottom

---

## Click/Tap and Text Selection Interaction

This section documents the interaction between navigation (click/tap) and text selection functionality in pagination mode.

### Design Principles

1. **Navigation-first by default**: Single click/tap triggers navigation (scroll or page change)
2. **Text selection requires explicit intent**: Drag (mouse) or long-press (touch) to select text
3. **Preserve existing selection**: When text is already selected, clicking/tapping inside the selection allows browser's native context menu (copy, etc.)

### Mouse Interaction (Desktop)

#### Click vs Drag Detection

The system distinguishes between click (navigation) and drag (text selection) based on movement distance:

| Movement | Threshold | Action |
|----------|-----------|--------|
| < 10px | Click | Navigation (scroll/page change) |
| ≥ 10px | Drag | Text selection |

#### Implementation Details

1. **`mousedown`**:
   - Record start position
   - Check if inside existing selection → if yes, allow browser handling
   - Call `preventDefault()` to prevent immediate text selection start

2. **`mousemove`**:
   - Track movement distance
   - If distance ≥ 10px, start text selection programmatically using `document.caretRangeFromPoint()`
   - Continue extending selection as mouse moves

3. **`mouseup`**:
   - If was dragging → do nothing (selection complete)
   - If inside existing selection → do nothing (allow context menu)
   - If click (< 10px movement) → trigger navigation

#### Text Selection Flow (Mouse)

```
mousedown
    │
    ├─ Inside existing selection? ─Yes→ Allow browser handling (context menu)
    │
    No
    │
    ▼
Record start position, preventDefault()
    │
    ▼
mousemove (tracking)
    │
    ├─ Movement ≥ 10px? ─Yes→ Start text selection (programmatic)
    │                         │
    │                         ▼
    │                   Continue extending selection
    │
    No (movement < 10px)
    │
    ▼
mouseup
    │
    ├─ Was dragging? ─Yes→ Selection complete, no navigation
    │
    No
    │
    ▼
Trigger navigation (scroll/page change)
```

### Touch Interaction (Mobile)

#### Tap vs Swipe vs Long-Press Detection

| Gesture | Criteria | Action |
|---------|----------|--------|
| Tap | < 10px movement, < 500ms | Navigation |
| Swipe | > 50px horizontal movement | Page navigation (at edge) |
| Long-press | Hold ≥ 500ms without moving | Text selection mode |

#### Long-Press Text Selection

Long-press (500ms) triggers text selection mode:

1. Timer starts on `touchstart`
2. If finger moves > 10px before 500ms, timer is cancelled (becomes swipe)
3. After 500ms, select word at touch point
4. Subsequent `touchmove` extends selection
5. `touchend` finalizes selection, skips navigation

#### Implementation Details

1. **`touchstart`**:
   - Record start position and time
   - Check if inside existing selection → if yes, allow browser handling
   - Start 500ms long-press timer

2. **`touchmove`**:
   - If inside existing selection → allow browser handling (selection handle drag)
   - If movement > 10px and timer still running → cancel timer
   - If in long-press mode → extend selection to current position

3. **`touchend`**:
   - Clear long-press timer
   - If inside existing selection → allow browser handling (context menu)
   - If long-press occurred → skip navigation
   - Otherwise → process as tap or swipe

#### Text Selection Flow (Touch)

```
touchstart
    │
    ├─ Inside existing selection? ─Yes→ Allow browser handling
    │                                   (context menu, selection handles)
    No
    │
    ▼
Start 500ms long-press timer
    │
    ▼
touchmove
    │
    ├─ Movement > 10px? ─Yes→ Cancel timer (will be swipe)
    │
    No (finger held still)
    │
    ▼
500ms elapsed
    │
    ▼
Select word at touch point
    │
    ▼
Further touchmove → Extend selection
    │
    ▼
touchend → Selection complete, skip navigation
```

### Existing Selection Handling

When text is already selected, special handling applies:

#### Detection

```typescript
const isPointInsideSelection = (x: number, y: number): boolean => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false
  }
  const range = selection.getRangeAt(0)
  const rects = range.getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true
    }
  }
  return false
}
```

#### Behavior When Clicking/Tapping Inside Selection

| Input | Action |
|-------|--------|
| Mouse click inside selection | Allow browser context menu (copy, etc.) |
| Touch tap inside selection | Allow browser context menu |
| Touch drag on selection handle | Allow selection range adjustment |

### Test Scenarios

#### Mouse Test Scenarios

##### Scenario M1: Click to Navigate
1. No text selected
2. Click (without dragging) on content area

**Expected**: Navigation occurs (scroll or page change based on position)

##### Scenario M2: Drag to Select Text
1. No text selected
2. Press mouse button and drag 10+ pixels

**Expected**: Text is selected, no navigation

##### Scenario M3: Click Inside Existing Selection
1. Select some text with drag
2. Click inside the selected text

**Expected**: Browser context menu appears (right-click menu or selection actions)

##### Scenario M4: Click Outside Existing Selection
1. Select some text with drag
2. Click outside the selected area

**Expected**: Selection is cleared, navigation occurs

#### Touch Test Scenarios

##### Scenario T1: Tap to Navigate
1. No text selected
2. Quick tap (< 500ms, < 10px movement)

**Expected**: Navigation occurs

##### Scenario T2: Swipe to Navigate
1. At page edge
2. Swipe horizontally (> 50px)

**Expected**: Page navigation occurs

##### Scenario T3: Long-Press to Select
1. No text selected
2. Press and hold for 500ms without moving

**Expected**: Word at touch point is selected

##### Scenario T4: Long-Press Then Drag
1. No text selected
2. Press and hold for 500ms
3. While still holding, drag finger

**Expected**: Selection extends to follow finger position

##### Scenario T5: Tap Inside Existing Selection
1. Select text via long-press
2. Tap inside the selected text

**Expected**: Browser context menu appears (copy, share, etc.)

##### Scenario T6: Drag Selection Handle
1. Select text via long-press
2. Drag the selection handle (start or end)

**Expected**: Selection range adjusts, browser native behavior

### Related Refs and State

```typescript
// Mouse state
const mouseStartX = useRef<number>(0)
const mouseStartY = useRef<number>(0)
const isDraggingRef = useRef<boolean>(false)
const mouseDownTargetRef = useRef<EventTarget | null>(null)
const clickedInsideSelectionRef = useRef<boolean>(false)

// Touch state
const touchStartX = useRef<number>(0)
const touchStartY = useRef<number>(0)
const touchEndX = useRef<number>(0)
const touchEndY = useRef<number>(0)
const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
const isLongPressRef = useRef<boolean>(false)
const touchStartTimeRef = useRef<number>(0)
const touchedInsideSelectionRef = useRef<boolean>(false)

// Touch/Mouse event deduplication
const touchHandledRef = useRef<boolean>(false)
```

### Touch and Mouse Event Deduplication

On touch devices, a tap generates both touch events (`touchstart`, `touchend`) and mouse events (`mousedown`, `mouseup`). Without proper handling, this causes navigation to fire twice (double page movement).

#### Solution: Touch-Handled Flag

```typescript
// In handleTouchStart
touchHandledRef.current = true

// In handleMouseDown
if (touchHandledRef.current) {
  return  // Skip - touch already handled this interaction
}

// In handleMouseUp
if (touchHandledRef.current) {
  touchHandledRef.current = false  // Reset for next interaction
  return  // Skip - touch already handled navigation
}
```

#### Event Flow

```
Touch tap on device:
    │
    ▼
touchstart
    │ touchHandledRef = true
    ▼
touchend
    │ Navigation executed
    ▼
mousedown (synthetic)
    │ touchHandledRef is true → Skip
    ▼
mouseup (synthetic)
    │ touchHandledRef is true → Skip, reset to false
    ▼
Done (navigation fired only once)
```

---

#### 9. "Layout breaks after window resize or browser zoom"

**Problem**: In vertical pagination mode, the prose element height becomes incorrect after resizing the browser window or changing zoom level. The content may overflow or show blank areas.

**Root Cause**: The prose element height is set programmatically on initial load and page changes, but not updated when the container size changes due to window resize or zoom.

**Solution**: Use `ResizeObserver` and window resize event listener to trigger layout recalculation:

```typescript
useEffect(() => {
  if (!loading && isVertical && isPagination) {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      // Debounce resize events to avoid excessive recalculations
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      resizeTimeout = setTimeout(() => {
        updateProseLayout()
      }, 100)
    }

    // Listen to window resize (covers both window resize and zoom changes)
    window.addEventListener('resize', handleResize)

    // Also use ResizeObserver for container-specific size changes
    let resizeObserver: ResizeObserver | null = null
    if (contentRef.current) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(contentRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }
}, [loading, isVertical, isPagination, contentRef, updateProseLayout])
```

**Why both listeners are needed**:
- `window.resize`: Catches browser window resizing and zoom level changes
- `ResizeObserver`: Catches container-specific size changes that may not trigger window resize (e.g., sidebar toggle, font size changes)
- **Debouncing**: Prevents excessive recalculations during continuous resize operations

## Interaction Settings

Users can customize reader interaction behavior via Settings → Interaction Settings. All interaction features can be individually enabled or disabled.

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Click/tap to scroll** | Enabled | Click/tap on screen to scroll within page (80% of visible area) |
| **Click/tap to turn page** | Enabled | Click/tap on screen edge to navigate to next/previous page |
| **Flick to scroll** | Enabled | Reserved for future flick-to-scroll functionality |
| **Flick to turn page** | Enabled | Flick/swipe at page edge to navigate to next/previous page |

### Settings Implementation

Settings are stored in `useReadingStore` under `settings.interaction`:

```typescript
export interface InteractionSettings {
  enableTapScroll: boolean       // Tap to scroll within page
  enableTapPageTurn: boolean     // Tap to turn page
  enableFlickScroll: boolean     // Flick to scroll within page (reserved)
  enableFlickPageTurn: boolean   // Flick to turn page
}
```

### How Settings Affect Behavior

#### All Settings Enabled (Default)
- Full navigation functionality
- Tap scrolls within page, navigates at edges
- Flick/swipe navigates pages at edges

#### Tap Scroll Disabled
- Tapping center area does not scroll
- Tapping at page edges still triggers page navigation (if tap page turn is enabled)

#### Tap Page Turn Disabled
- Tapping at edges does not navigate pages
- Tapping center area still scrolls within page (if tap scroll is enabled)

#### Both Tap Settings Disabled
- Touch/click navigation completely disabled
- Keyboard and flick navigation still work
- Useful for read-only mode or when user wants to minimize accidental navigation

#### Flick Page Turn Disabled
- Swipe gestures do not trigger page navigation
- Tap navigation still works
- Useful for devices with sensitive touch screens

### Use Cases

**Minimize Accidental Navigation**:
- Disable tap page turn
- Keep tap scroll enabled
- Users can scroll freely without accidentally changing pages

**Reading on Moving Vehicle**:
- Disable flick page turn
- Keep tap navigation enabled
- Prevents unintentional swipes from vehicle motion

**Text Selection Priority**:
- Disable both tap settings
- Use only keyboard navigation
- Makes text selection easier without triggering navigation

**Last Updated**: 2025-01-13
**Created**: To prevent scrollLeft/display position confusion and facilitate future maintenance
**Revision History**:
- 2025-01-13: Added "Interaction Settings" section documenting customizable reader interaction controls (tap scroll, tap page turn, flick scroll, flick page turn).
- 2025-12-20: Updated image sizing documentation to use container query units (`cqw`/`cqh`) instead of viewport units, with `container-type: size` on prose container. Added "Heading Digit Conversion for Vertical Mode" section documenting `convertHeadingDigitsToFullWidth()` function. Added "Link Handling" section documenting external links opening in new tabs and link click navigation bypass.
- 2025-12-15: Added "KaTeX Math Rendering in Vertical Mode" section documenting the three-layer wrapper structure, HTML pre-processing with `wrapKatexForVertical()`, margin adjustment using `useLayoutEffect` without dependencies, and the `katex-rotation-complete` event for synchronizing scroll restoration.
- 2025-12-09: Added troubleshooting item #9 documenting window resize and browser zoom handling with `ResizeObserver` and debounced event listeners.
- 2025-12-04: Added "Keyboard Navigation" section documenting arrow key navigation with 80% scroll and page transition at edges. Updated horizontal mode documentation with top/bottom tap behavior, vertical swipe navigation, and scroll position on page change. Added test scenarios H1-H6 for horizontal mode.
- 2025-12-04: Added troubleshooting item #8 documenting scroll position flickering fix using Zustand selectors and `getState()` pattern to prevent re-renders during progress updates.
- 2025-12-03: Added "Touch and Mouse Event Deduplication" section documenting `touchHandledRef` flag to prevent double page navigation on tap.
- 2025-12-03: Added troubleshooting item #7 documenting touch drag scroll fix for vertical mode using `overflow-x: auto` and `touch-action: pan-x`.
- 2025-12-03: Added "Typography and Spacing" section documenting block element margins for vertical/horizontal modes, image layout with flex containers, and spacer elements for preserving multiple blank lines from Markdown.
- 2025-12-03: Added "Click/Tap and Text Selection Interaction" section documenting mouse drag selection, touch long-press selection, and existing selection handling with browser context menu support.
- 2025-12-03: Added troubleshooting item #6 documenting vertical-rl height overflow issue and JavaScript-based solution.
- 2025-12-03: Added "Horizontal Pagination Mode" section documenting content area height constraints and tap navigation for horizontal mode.
- 2025-12-03: Added "Scroll Position on Page Navigation" section with correct scrollLeft values for Prev/Next operations. Added troubleshooting items #4 and #5.
- 2025-12-03: Added "Tap Navigation" section documenting tap-to-scroll and tap-to-navigate behavior. Added test scenarios #5, #6, #7 for tap operations.

**Japanese version**: [docs/ja/VERTICAL_MODE_SPEC.md](./ja/VERTICAL_MODE_SPEC.md)
