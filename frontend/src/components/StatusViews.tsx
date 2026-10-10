import { NotesIcon } from './icons'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    >
      <span>{message}</span>
      <div className="flex gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-medium underline">
            Retry
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="font-medium">
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export function LoadingGrid() {
  const heights = ['h-28', 'h-44', 'h-36', 'h-52', 'h-32', 'h-40', 'h-36', 'h-28']
  return (
    <div role="status" aria-label="Loading notes" className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
      {heights.map((h, i) => (
        <div key={i} className={`${h} animate-pulse rounded-lg bg-black/6 dark:bg-white/8`} />
      ))}
    </div>
  )
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <NotesIcon className="mb-4 h-24 w-24 text-black/12 dark:text-white/15" />
      <p className="text-lg text-[#5f6368] dark:text-[#9aa0a6]">{title}</p>
      {action}
    </div>
  )
}
