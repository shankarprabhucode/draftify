import { createContext } from 'react'

export interface ToastOptions {
  message: string
  /** Label and handler for an optional action button, e.g. Undo. */
  action?: { label: string; onClick: () => void }
  /** Milliseconds before the toast disappears. */
  duration?: number
  /** Called when the toast closes without the action being taken. */
  onExpire?: () => void
}

export interface Toast extends ToastOptions {
  id: number
}

export interface ToastContextValue {
  toasts: Toast[]
  show: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
