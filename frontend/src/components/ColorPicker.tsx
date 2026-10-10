import { NOTE_COLORS, type NoteColor } from '../api/notes'
import { colorStyles } from '../lib/colors'

interface ColorPickerProps {
  value: NoteColor
  onChange: (color: NoteColor) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Note colour" className="flex flex-wrap gap-1.5">
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={colorStyles[color].label}
          title={colorStyles[color].label}
          onClick={() => onChange(color)}
          className={`h-6 w-6 rounded-full border transition hover:scale-110 ${colorStyles[color].swatch} ${
            value === color ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''
          }`}
        />
      ))}
    </div>
  )
}
