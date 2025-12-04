'use client'

import { useTheme } from '@/lib/hooks/useTheme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTheme()
  return <>{children}</>
}
