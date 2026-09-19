import { getAbsoluteUrl, getBasePath } from '@/lib/utils/basePath'

export const defaultOgImage = {
  path: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'DeusLibri digital library preview',
  type: 'image/jpeg',
} as const

export function getDefaultOgImageUrl(): string {
  return getAbsoluteUrl(`${getBasePath()}${defaultOgImage.path}`)
}

export function getDefaultOgImages() {
  return [
    {
      url: getDefaultOgImageUrl(),
      width: defaultOgImage.width,
      height: defaultOgImage.height,
      alt: defaultOgImage.alt,
      type: defaultOgImage.type,
    },
  ]
}
