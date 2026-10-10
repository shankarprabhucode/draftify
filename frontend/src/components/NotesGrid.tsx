import type { Note } from '../api/notes'
import { NoteCard } from './NoteCard'

interface NotesGridProps {
  notes: Note[]
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

/** One masonry wall. Pinned notes are already sorted first by the caller. */
export function NotesGrid({ notes, ...handlers }: NotesGridProps) {
  return (
    <div className="masonry" aria-label="Notes">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} {...handlers} />
      ))}
    </div>
  )
}
