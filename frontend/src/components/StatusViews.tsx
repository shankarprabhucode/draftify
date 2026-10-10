interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
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
  const heights = ['h-32', 'h-48', 'h-40', 'h-56', 'h-36', 'h-44', 'h-40', 'h-32']
  return (
    <div role="status" aria-label="Loading notes" className="notes-grid">
      {heights.map((h, i) => (
        <div key={i} className={`${h} animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800`} />
      ))}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-20 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl dark:bg-indigo-950">
        📝
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}
