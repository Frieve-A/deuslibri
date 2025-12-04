// Ad display configuration
// Ads are shown after accumulating this many bytes of text since the last ad
// Japanese characters count as 2 bytes, so 5000 Japanese chars = 10000 bytes
// English characters count as 1 byte, so 10000 English chars = 10000 bytes
export const AD_THRESHOLD_BYTES = 10000

// Edge detection threshold in pixels
export const EDGE_THRESHOLD = 50

// Minimum swipe distance for navigation
export const MIN_SWIPE_DISTANCE = 50

// Long press duration for text selection (ms)
export const LONG_PRESS_DURATION = 500

// Scroll save debounce delay (ms)
export const SCROLL_SAVE_DELAY = 500

// Smooth scroll animation duration (ms)
export const SMOOTH_SCROLL_DURATION = 500

// Click distance threshold for distinguishing click from drag
export const CLICK_THRESHOLD = 10

// Scroll amount as percentage of visible area
export const SCROLL_AMOUNT_RATIO = 0.8
