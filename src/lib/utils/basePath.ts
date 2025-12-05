/**
 * Get the base URL for the application
 * Set NEXT_PUBLIC_BASE_URL environment variable to configure
 * For GitHub Pages: 'https://yourusername.github.io/deuslibri'
 * For custom domain: 'https://example.com'
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://yourusername.github.io/deuslibri'
}

/**
 * Get the base path from NEXT_PUBLIC_BASE_URL
 * Extracts the pathname portion (e.g., '/deuslibri' from 'https://example.github.io/deuslibri')
 * Falls back to NEXT_PUBLIC_BASE_PATH for backwards compatibility
 */
export function getBasePath(): string {
  // Backwards compatibility: prefer explicit BASE_PATH if set
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH
  }

  // Extract path from BASE_URL
  const baseUrl = getBaseUrl()
  try {
    const url = new URL(baseUrl)
    // Remove trailing slash if present
    return url.pathname.replace(/\/$/, '')
  } catch {
    return ''
  }
}

/**
 * Prepend the base path to a given path
 * @param path - The path to prepend the base path to (should start with /)
 * @returns The path with the base path prepended
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath()
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  return basePath + path
}

/**
 * Generate the content image path with base path
 * @param folderPath - The book's folder path
 * @param imagePath - The image path (e.g., './images/cover.jpg' or 'images/cover.jpg')
 * @returns The full path to the image with base path
 */
export function getContentImagePath(folderPath: string, imagePath: string): string {
  const relativePath = folderPath.replace(/\\/g, '/').split('content/books/')[1]
  const cleanImagePath = imagePath.replace(/^\.\//, '')
  return withBasePath(`/content/books/${relativePath}/${cleanImagePath}`)
}

/**
 * Get the origin URL (protocol + host, without path)
 * @returns The origin URL extracted from NEXT_PUBLIC_BASE_URL
 */
export function getOriginUrl(): string {
  const baseUrl = getBaseUrl()
  try {
    const url = new URL(baseUrl)
    return url.origin
  } catch {
    return baseUrl
  }
}

/**
 * Convert a path (already containing basePath) to an absolute URL
 * @param pathWithBasePath - The path that already includes basePath (e.g., /deuslibri/content/...)
 * @returns The absolute URL
 */
export function getAbsoluteUrl(pathWithBasePath: string): string {
  const origin = getOriginUrl()
  if (!pathWithBasePath.startsWith('/')) {
    pathWithBasePath = '/' + pathWithBasePath
  }
  return origin + pathWithBasePath
}
