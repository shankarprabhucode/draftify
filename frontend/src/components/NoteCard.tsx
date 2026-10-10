import type { Note } from '../api/notes'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  deleting?: boolean
}

export function NoteCard({ note, onEdit, onDelete, deleting = false }: NoteCardProps) {
  const pendingCreate = note.id < 0

  return (
    <article
      aria-busy={pendingCreate || deleting}
      className={`flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition ${
        pendingCreate || deleting ? 'opacity-60' : 'hover:shadow-md'
      }`}
    >
      <h3 className="mb-2 line-clamp-2 text-base font-semibold text-slate-900">{note.title}</h3>
      <p className="mb-4 line-clamp-5 flex-1 whitespace-pre-wrap text-sm text-slate-600">
        {note.content || <span className="italic text-slate-400">No content</span>}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(note)}
          disabled={pendingCreate || deleting}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(note)}
          disabled={pendingCreate || deleting}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </article>
  )
}
