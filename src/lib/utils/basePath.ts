/**
 * Get the base path for the application
 * Set NEXT_PUBLIC_BASE_PATH environment variable to configure
 * For GitHub Pages: '/deuslibri'
 * For custom domain: '' (empty string)
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || ''
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
