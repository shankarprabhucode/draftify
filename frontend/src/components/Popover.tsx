import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  open: boolean
  onClose: () => void
  /** Anchor-relative placement. The anchor is the Popover's parent element. */
  align?: 'left' | 'right'
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

const MARGIN = 8
const OFFSET = 4

/**
 * Popover rendered through a portal and positioned against its parent element,
 * so it is never clipped or covered by stacking contexts (e.g. drag transforms).
 * Closes on outside click or Escape; flips to stay inside the viewport.
 */
export function Popover({ open, onClose, align = 'left', side = 'bottom', children, className = '' }: PopoverProps) {
  const marker = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = marker.current?.parentElement
      const el = panel.current
      if (!anchor || !el) return
      const r = anchor.getBoundingClientRect()
      const w = el.offsetWidth
      const h = el.offsetHeight
      let top = side === 'bottom' ? r.bottom + OFFSET : r.top - OFFSET - h
      if (top + h > window.innerHeight - MARGIN) top = r.top - OFFSET - h
      if (top < MARGIN) top = Math.min(r.bottom + OFFSET, window.innerHeight - h - MARGIN)
      let left = align === 'left' ? r.left : r.right - w
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN))
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align, side])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      const anchor = marker.current?.parentElement
      if (panel.current?.contains(target) || anchor?.contains(target)) return
      onClose()
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

  return (
    <>
      <span ref={marker} hidden />
      {open &&
        createPortal(
          <div
            ref={panel}
            role="presentation"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={`z-[60] animate-rise rounded-lg border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#2d2e30] ${className}`}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
