import { useEffect, useRef, type ReactNode } from 'react'

interface PopoverProps {
  open: boolean
  onClose: () => void
  /** Anchor-relative placement. */
  align?: 'left' | 'right'
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

/** Minimal popover: absolutely positioned, closes on outside click or Escape. */
export function Popover({ open, onClose, align = 'left', side = 'bottom', children, className = '' }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute z-40 animate-rise rounded-lg border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#2d2e30] ${
        align === 'left' ? 'left-0' : 'right-0'
      } ${side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'} ${className}`}
    >
      {children}
    </div>
  )
}
