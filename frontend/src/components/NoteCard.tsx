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
      className={`group relative animate-rise rounded-2xl border shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${colorStyles[note.color].surface} ${
        pendingCreate ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(note)}
        disabled={pendingCreate}
        aria-label={`Open note ${untitled ? 'untitled' : note.title}`}
        className="block w-full cursor-pointer rounded-2xl px-4 pt-4 pb-2 text-left"
      >
        {!untitled && (
          <h3 className="mb-1 pr-7 text-[15px] leading-snug font-semibold tracking-tight">{note.title}</h3>
        )}
        {html ? (
          <div
            className="rich-text note-preview max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : untitled ? (
          <p className="text-sm text-slate-400 italic">Empty note</p>
        ) : null}
      </button>

      <div className="absolute top-2 right-2">
        <IconButton
          label={note.pinned ? 'Unpin note' : 'Pin note'}
          active={note.pinned}
          onClick={() => onTogglePin(note)}
          disabled={pendingCreate}
          className={`h-7 w-7 ${note.pinned ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
        >
          <PinIcon filled={note.pinned} />
        </IconButton>
      </div>

      <footer className="flex h-9 items-center justify-between px-4 pb-1">
        {pendingCreate ? (
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400" aria-live="polite">
            <Spinner className="h-3 w-3" /> Saving…
          </span>
        ) : (
          <time dateTime={note.updated_at} className="text-[11px] text-slate-400 transition group-hover:text-slate-500">
            {formatRelative(note.updated_at)}
          </time>
        )}
        <IconButton
          label="Delete note"
          onClick={() => onDelete(note)}
          disabled={pendingCreate}
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon />
        </IconButton>
      </footer>
    </article>
  )
})
