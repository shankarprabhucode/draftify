import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  /** Where the label appears relative to the element. */
  placement?: 'bottom' | 'top' | 'right'
  /** Milliseconds before the label appears on hover. */
  delay?: number
  children: ReactNode
}

const GAP = 6
const MARGIN = 6

/**
 * Keep-style tooltip: a small dark label shown on hover (after a short delay)
 * or immediately on keyboard focus. Rendered through a portal so it is never
 * clipped. Purely visual: the wrapped control keeps its own aria-label.
 */
export function Tooltip({ label, placement = 'bottom', delay = 350, children }: TooltipProps) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const show = (immediate = false) => {
    if (timer.current) clearTimeout(timer.current)
    if (immediate) setOpen(true)
    else timer.current = setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!open) return
    const a = anchor.current
    const p = panel.current
    if (!a || !p) return
    const r = a.getBoundingClientRect()
    const w = p.offsetWidth
    const h = p.offsetHeight
    let top: number
    let left: number
    if (placement === 'right') {
      top = r.top + r.height / 2 - h / 2
      left = r.right + GAP
    } else {
      left = r.left + r.width / 2 - w / 2
      top = placement === 'bottom' ? r.bottom + GAP : r.top - GAP - h
      if (top + h > window.innerHeight - MARGIN) top = r.top - GAP - h
      if (top < MARGIN) top = r.bottom + GAP
    }
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN))
    setPos({ top, left })
  }, [open, placement])

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        onMouseEnter={() => show()}
        onMouseLeave={hide}
        onMouseDown={hide}
        onFocus={(e) => e.target.matches(':focus-visible') && show(true)}
        onBlur={hide}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="tooltip"
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="pointer-events-none z-[70] animate-rise rounded bg-[#3c4043] px-2 py-1 text-[12px] font-medium whitespace-nowrap text-white shadow-md dark:bg-[#e8eaed] dark:text-[#202124]"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  )
}
