import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import ThemeProvider from '@/components/ThemeProvider'
import { getBasePath } from '@/lib/utils/basePath'
import 'katex/dist/katex.min.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const basePath = getBasePath()

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    template: '%s | DeusLibri',
    default: 'DeusLibri - Free Digital Library',
  },
  description: 'A beautiful digital library for reading books online. Discover and read free books with a modern, customizable reading experience.',
  keywords: ['digital library', 'free books', 'ebooks', 'online reading', 'literature'],
  authors: [{ name: 'DeusLibri' }],
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-64x64.png`, sizes: '64x64', type: 'image/png' },
      { url: `${basePath}/icons/icon-192x192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${basePath}/icons/icon-512x512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: `${basePath}/icons/icon-180x180.png`, sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DeusLibri',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'DeusLibri - Free Digital Library',
    description: 'A beautiful digital library for reading books online',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DeusLibri - Free Digital Library',
    description: 'A beautiful digital library for reading books online',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // AdSense publisher ID - replace with your actual publisher ID
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-XXXXXXXXXXXXXXXX'

  const gaId = 'G-FW9YWVLT8E'

  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}
        </Script>
        {/* Google AdSense - TEMPORARILY DISABLED
        {process.env.NODE_ENV === 'production' && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        */}
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
