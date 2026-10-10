import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastContextValue, type ToastOptions } from './toastContext'

const DEFAULT_DURATION = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      const toast: Toast = { id, ...options }
      setToasts((list) => [...list, toast])
      timers.current.set(
        id,
        setTimeout(() => {
          remove(id)
          options.onExpire?.()
        }, options.duration ?? DEFAULT_DURATION),
      )
      return id
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, show, dismiss: remove }),
    [toasts, show, remove],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
