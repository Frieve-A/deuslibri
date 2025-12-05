/** @type {import('next').NextConfig} */

// Extract basePath from NEXT_PUBLIC_BASE_URL or fall back to NEXT_PUBLIC_BASE_PATH
function getBasePath() {
  // Backwards compatibility
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH
  }

  // Extract from BASE_URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      return url.pathname.replace(/\/$/, '')
    } catch {
      return ''
    }
  }

  return ''
}

const basePath = getBasePath()

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
}

module.exports = nextConfig
