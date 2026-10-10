import type { Label } from '../api/notes'
import { CloseIcon } from './icons'

interface LabelChipsProps {
  labels: Label[]
  onRemove?: (label: Label) => void
  onClick?: (label: Label) => void
}

export function LabelChips({ labels, onRemove, onClick }: LabelChipsProps) {
  if (labels.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
      {labels.map((label) => (
        <li
          key={label.id}
          className="group/chip flex h-6 items-center gap-1 rounded-full bg-black/8 pr-1.5 pl-2.5 text-[11px] font-medium text-[#3c4043] dark:bg-white/12 dark:text-[#e8eaed]"
        >
          {onClick ? (
            <button type="button" onClick={() => onClick(label)} className="hover:underline">
              {label.name}
            </button>
          ) : (
            <span>{label.name}</span>
          )}
          {onRemove ? (
            <button
              type="button"
              aria-label={`Remove label ${label.name}`}
              onClick={() => onRemove(label)}
              className="flex h-4 w-4 items-center justify-center rounded-full opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/20"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          ) : (
            <span className="w-1" />
          )}
        </li>
      ))}
    </ul>
  )
}
