import { NOTE_COLORS, type NoteColor } from '../api/notes'
import { colorStyles } from '../lib/colors'
import { CheckIcon } from './icons'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Note colour" className="flex flex-wrap gap-1.5 p-2">
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={colorStyles[color].label}
          title={colorStyles[color].label}
          onClick={() => onChange(color)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition hover:border-[#202124] dark:hover:border-white ${colorStyles[color].swatch} ${
            value === color ? 'border-[#a142f4] dark:border-[#a142f4]' : ''
          }`}
        >
          {value === color && <CheckIcon className="h-4 w-4 text-[#202124] dark:text-white" />}
        </button>
      ))}
    </div>
  )
}
