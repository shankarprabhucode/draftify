import { useState } from 'react'
import type { Label } from '../api/notes'
import { useCreateLabel, useLabels } from '../hooks/useLabels'
import { PlusIcon } from './icons'

interface LabelPickerProps {
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

/** Keep's "Label note" list: search, tick labels, create one inline. */
export function LabelPicker({ selectedIds, onChange }: LabelPickerProps) {
  const labels = useLabels()
  const create = useCreateLabel()
  const [query, setQuery] = useState('')

  const all = labels.data ?? []
  const q = query.trim()
  const shown = q ? all.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())) : all
  const exact = all.some((l) => l.name.toLowerCase() === q.toLowerCase())

  const toggle = (label: Label) =>
    onChange(
      selectedIds.includes(label.id)
        ? selectedIds.filter((id) => id !== label.id)
        : [...selectedIds, label.id],
    )

  const createAndSelect = () => {
    if (!q || exact || create.isPending) return
    create.mutate(q, {
      onSuccess: (label) => {
        onChange([...selectedIds, label.id])
        setQuery('')
      },
    })
  }

  return (
    <div className="w-60 py-2 text-sm">
      <p className="px-3 pb-1 text-[13px] font-medium text-[#202124] dark:text-[#e8eaed]">Label note</p>
      <div className="px-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createAndSelect()}
          placeholder="Enter label name"
          aria-label="Search or create label"
          className="w-full border-b border-black/15 bg-transparent py-1 text-[13px] outline-none placeholder:text-[#80868b] focus:border-[#202124] dark:border-white/20 dark:focus:border-white"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
        {shown.map((label) => {
          const checked = selectedIds.includes(label.id)
          return (
            <li key={label.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(label)}
                  className="h-4 w-4 accent-[#5f6368]"
                />
                <span className="truncate text-[13px]">{label.name}</span>
              </label>
            </li>
          )
        })}
        {shown.length === 0 && !q && (
          <li className="px-3 py-2 text-[12px] text-[#80868b]">No labels yet</li>
        )}
      </ul>
      {q && !exact && (
        <button
          type="button"
          onClick={createAndSelect}
          disabled={create.isPending}
          className="flex w-full items-center gap-2 border-t border-black/10 px-3 py-2 text-left text-[13px] hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          <PlusIcon className="h-4 w-4" />
          Create “{q}”
        </button>
      )}
      {create.isError && (
        <p role="alert" className="px-3 pt-1 text-[12px] text-red-600">
          {create.error.message}
        </p>
      )}
    </div>
  )
}
