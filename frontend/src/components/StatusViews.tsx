interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span>{message}</span>
      <div className="flex gap-2">
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
  return (
    <div role="status" aria-label="Loading notes" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center">
      <p className="mb-4 text-slate-500">{message}</p>
      {action}
    </div>
  )
}
