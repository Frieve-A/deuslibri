'use client'

import { useEffect } from 'react'

interface AdSenseProps {
  adSlot: string
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  adLayout?: string
  className?: string
  style?: React.CSSProperties
}

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export default function AdSense({
  adSlot,
  adFormat = 'auto',
  adLayout,
  className = '',
  style = { display: 'block' },
}: AdSenseProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error('AdSense error:', err)
      }
    }
  }, [])

  // Don't show ads in development
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center p-4 ${className}`}
        style={style}
      >
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Ad Space (AdSense in production)
        </p>
      </div>
    )
  }

  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-XXXXXXXXXXXXXXXX'

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client={adsenseId}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-ad-layout={adLayout}
      data-full-width-responsive="true"
    />
  )
}
