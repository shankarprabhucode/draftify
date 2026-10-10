import { useEffect, useRef, useState } from 'react'
import type { Label } from '../api/notes'
import { useCreateLabel, useDeleteLabel, useLabels, useRenameLabel } from '../hooks/useLabels'
import { CheckIcon, CloseIcon, LabelIcon, PlusIcon, TrashIcon } from './icons'
import { IconButton } from './IconButton'

function LabelRow({ label }: { label: Label }) {
  const rename = useRenameLabel()
  const remove = useDeleteLabel()
  const [name, setName] = useState(label.name)
  const dirty = name.trim() !== label.name && name.trim().length > 0

  const commit = () => {
    if (dirty) rename.mutate({ id: label.id, name: name.trim() })
  }

  return (
    <li className="group flex items-center gap-2 px-2 py-1">
      <IconButton
        label={`Delete label ${label.name}`}
        onClick={() => {
          if (window.confirm(`Delete label "${label.name}"? Notes keep their content.`)) remove.mutate(label.id)
        }}
        className="text-[#5f6368]"
      >
        <span className="group-hover:hidden"><LabelIcon className="h-4 w-4" /></span>
        <span className="hidden group-hover:block"><TrashIcon /></span>
      </IconButton>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        maxLength={50}
        aria-label={`Label name ${label.name}`}
        className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm outline-none focus:border-black/30 dark:focus:border-white/40"
      />
      <IconButton label={dirty ? 'Save name' : 'Saved'} onClick={commit} disabled={!dirty}>
        {rename.isPending ? '…' : <CheckIcon />}
      </IconButton>
      {(rename.isError || remove.isError) && (
        <span role="alert" className="text-xs text-red-600">
          {(rename.error ?? remove.error)?.message}
        </span>
      )}
    </li>
  )
}

export function EditLabelsDialog({ onClose }: { onClose: () => void }) {
  const labels = useLabels()
  const create = useCreateLabel()
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    const name = draft.trim()
    if (!name || create.isPending) return
    create.mutate(name, {
      onSuccess: () => {
        setDraft('')
        input.current?.focus()
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit labels"
        className="w-full max-w-xs animate-rise rounded-lg bg-white shadow-2xl dark:bg-[#2d2e30]"
      >
        <h2 className="px-4 pt-4 pb-2 text-base font-medium">Edit labels</h2>
        <div className="flex items-center gap-2 px-2">
          <IconButton label={draft ? 'Clear' : 'New label'} onClick={() => setDraft('')}>
            {draft ? <CloseIcon /> : <PlusIcon />}
          </IconButton>
          <input
            ref={input}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Create new label"
            maxLength={50}
            aria-label="New label name"
            className="min-w-0 flex-1 border-b border-black/15 bg-transparent py-1 text-sm outline-none focus:border-[#202124] dark:border-white/20 dark:focus:border-white"
          />
          <IconButton label="Create label" onClick={submit} disabled={!draft.trim() || create.isPending}>
            <CheckIcon />
          </IconButton>
        </div>
        {create.isError && (
          <p role="alert" className="px-4 pt-1 text-xs text-red-600">
            {create.error.message}
          </p>
        )}
        <ul className="max-h-72 overflow-y-auto py-2">
          {(labels.data ?? []).map((label) => (
            <LabelRow key={label.id} label={label} />
          ))}
        </ul>
        <div className="flex justify-end border-t border-black/10 px-3 py-2 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
