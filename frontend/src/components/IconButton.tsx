import { Tooltip } from './Tooltip'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  /** Tooltip placement. */
  tooltip?: 'bottom' | 'top' | 'right'
}

/** Round icon button with an accessible label and tooltip; children is the glyph. */
export function IconButton({ label, active, tooltip = 'bottom', className = '', children, ...rest }: IconButtonProps) {
  return (
    <Tooltip label={label} placement={tooltip}>
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] transition hover:bg-black/8 disabled:opacity-40 dark:text-[#e8eaed] dark:hover:bg-white/10 ${
        active ? 'text-[#202124] dark:text-white' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
    </Tooltip>
  )
}

export { PaletteIcon, PencilIcon, PinIcon, TrashIcon } from './icons'
