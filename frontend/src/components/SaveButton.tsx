export type SaveState = 'empty' | 'dirty' | 'saving' | 'saved'

interface SaveButtonProps {
  state: SaveState
  onClick: () => void
}

export const Spinner = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

/** Primary action that doubles as a save-status indicator. */
export function SaveButton({ state, onClick }: SaveButtonProps) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition'
  if (state === 'saving') {
    return (
      <button type="button" disabled aria-live="polite" className={`${base} bg-indigo-600/80 text-white`}>
        <Spinner /> Saving…
      </button>
    )
  }
  if (state === 'saved') {
    return (
      <button type="button" disabled aria-live="polite" className={`${base} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}>
        <CheckIcon /> Saved
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'empty'}
      className={`${base} bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40`}
    >
      Save
    </button>
  )
}
