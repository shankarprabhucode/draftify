import { memo, useMemo } from 'react'
import type { Note } from '../api/notes'
import { colorStyles } from '../lib/colors'
import { sanitize } from '../lib/html'
import { formatRelative } from '../lib/time'
import { IconButton, PinIcon, TrashIcon } from './IconButton'
import { Spinner } from './SaveButton'

interface NoteCardProps {
  note: Note
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

export const NoteCard = memo(function NoteCard({ note, onOpen, onTogglePin, onDelete }: NoteCardProps) {
  const pendingCreate = note.id < 0
  const html = useMemo(() => sanitize(note.content), [note.content])
  const untitled = !note.title.trim()

  return (
    <article
      aria-busy={pendingCreate}
      className={`group relative animate-rise rounded-xl border p-4 shadow-sm transition hover:shadow-md ${colorStyles[note.color].surface} ${
        pendingCreate ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(note)}
        disabled={pendingCreate}
        aria-label={`Open note ${untitled ? 'untitled' : note.title}`}
        className="block w-full cursor-pointer text-left"
      >
        {!untitled && <h3 className="mb-1.5 pr-8 text-base font-semibold leading-snug">{note.title}</h3>}
        {html ? (
          <div
            className="rich-text note-preview max-h-72 overflow-hidden [mask-image:linear-gradient(to_bottom,black_85%,transparent)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : untitled ? (
          <p className="text-sm italic text-slate-400">Empty note</p>
        ) : null}
      </button>

      <div className="absolute top-2 right-2">
        <IconButton
          label={note.pinned ? 'Unpin note' : 'Pin note'}
          active={note.pinned}
          onClick={() => onTogglePin(note)}
          disabled={pendingCreate}
          className={note.pinned ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}
        >
          <PinIcon filled={note.pinned} />
        </IconButton>
      </div>

      <footer className="mt-3 flex items-center justify-between">
        {pendingCreate ? (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400" aria-live="polite">
            <Spinner /> Saving…
          </span>
        ) : (
          <time dateTime={note.updated_at} className="text-xs text-slate-500">
            {formatRelative(note.updated_at)}
          </time>
        )}
        <IconButton
          label="Delete note"
          onClick={() => onDelete(note)}
          disabled={pendingCreate}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon />
        </IconButton>
      </footer>
    </article>
  )
})
