/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/deuslibri' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/deuslibri/' : '',
}

module.exports = nextConfig
