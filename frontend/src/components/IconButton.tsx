interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

/** Round icon button with an accessible label; children is the glyph. */
export function IconButton({ label, active, className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] transition hover:bg-black/8 disabled:opacity-40 dark:text-[#e8eaed] dark:hover:bg-white/10 ${
        active ? 'text-[#202124] dark:text-white' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export { PaletteIcon, PencilIcon, PinIcon, TrashIcon } from './icons'
