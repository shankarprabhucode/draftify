import { useState, type FormEvent } from 'react'
import type { NoteInput } from '../api/notes'

interface NoteFormProps {
  initial?: NoteInput
  submitLabel: string
  pending?: boolean
  error?: string | null
  onSubmit: (input: NoteInput) => void
  onCancel: () => void
}

export function NoteForm({
  initial = { title: '', content: '' },
  submitLabel,
  pending = false,
  error,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [title, setTitle] = useState(initial.title)
  const [content, setContent] = useState(initial.content)
  const canSubmit = title.trim().length > 0 && !pending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ title: title.trim(), content: content.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Grocery list"
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Content
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={10_000}
          placeholder="Eggs, milk, bread…"
          className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-base font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
