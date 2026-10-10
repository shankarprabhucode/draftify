import type { NoteColor } from '../api/notes'
import { colorStyles } from '../lib/colors'
import { IconButton } from './IconButton'
import { PaletteIcon } from './icons'

interface ColorButtonProps {
  color: NoteColor
  active?: boolean
  onClick: () => void
}

/** Opens the colour picker; its glyph is a swatch of the current colour. */
export function ColorButton({ color, active, onClick }: ColorButtonProps) {
  const label = color === 'default' ? 'Change colour' : `Change colour (${colorStyles[color].label})`
  return (
    <IconButton label={label} active={active} onClick={onClick}>
      {color === 'default' ? (
        <PaletteIcon />
      ) : (
        <span
          aria-hidden="true"
          className={`block h-4.5 w-4.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] ${colorStyles[color].swatch} dark:border-[#e8eaed]`}
        />
      )}
    </IconButton>
  )
}
