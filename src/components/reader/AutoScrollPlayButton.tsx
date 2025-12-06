'use client'

interface AutoScrollPlayButtonProps {
  isPlaying: boolean
  onToggle: () => void
}

export function AutoScrollPlayButton({ isPlaying, onToggle }: AutoScrollPlayButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-amber-600/50 dark:bg-sky-600/50 text-white shadow-lg hover:bg-amber-700/70 dark:hover:bg-sky-700/70 transition-colors flex items-center justify-center"
      aria-label={isPlaying ? 'Pause auto scroll' : 'Play auto scroll'}
    >
      {isPlaying ? (
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 ml-1"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      )}
    </button>
  )
}
