'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

interface PwaInstallContextValue {
  canInstall: boolean
  isInstalling: boolean
  install: () => Promise<void>
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isInstalling: false,
  install: async () => {},
})

function isRunningAsInstalledApp() {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  )
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    const updateInstalledState = () => {
      const installed = isRunningAsInstalledApp()
      setIsInstalled(installed)
      if (installed) {
        setDeferredPrompt(null)
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (isRunningAsInstalledApp()) return

      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    const displayModeQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ]

    updateInstalledState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    displayModeQueries.forEach((query) => {
      query.addEventListener('change', updateInstalledState)
    })

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)

      displayModeQueries.forEach((query) => {
        query.removeEventListener('change', updateInstalledState)
      })
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt || isInstalling) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
      setIsInstalled(isRunningAsInstalledApp())
    }
  }, [deferredPrompt, isInstalling])

  const value = useMemo(
    () => ({
      canInstall: !isInstalled && deferredPrompt !== null,
      isInstalling,
      install,
    }),
    [deferredPrompt, install, isInstalled, isInstalling]
  )

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstallPrompt() {
  return useContext(PwaInstallContext)
}
