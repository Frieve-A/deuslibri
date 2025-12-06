import type { MetadataRoute } from 'next'
import { getBasePath } from '@/lib/utils/basePath'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  const basePath = getBasePath()

  return {
    name: 'DeusLibri - Free Digital Library',
    short_name: 'DeusLibri',
    description:
      'A beautiful digital library for reading books online. Discover and read free books with a modern, customizable reading experience.',
    start_url: basePath || '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a2e',
    icons: [
      {
        src: `${basePath}/icons/icon-64x64.png`,
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: `${basePath}/icons/icon-180x180.png`,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${basePath}/icons/icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${basePath}/icons/icon-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['books', 'education', 'entertainment'],
    lang: 'ja',
    dir: 'ltr',
  }
}
