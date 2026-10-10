import type { Note } from '../api/notes'
import { NoteCard } from './NoteCard'

interface NotesGridProps {
  pinned: Note[]
  others: Note[]
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

function Section({ title, notes, ...handlers }: { title?: string; notes: Note[] } & Omit<NotesGridProps, 'pinned' | 'others'>) {
  if (notes.length === 0) return null
  return (
    <section aria-label={title ?? 'Notes'} className="mb-6">
      {title && (
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
      )}
      <div className="masonry">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} {...handlers} />
        ))}
      </div>
    </section>
  )
}

export function NotesGrid({ pinned, others, ...handlers }: NotesGridProps) {
  const showHeadings = pinned.length > 0
  return (
    <>
      <Section title={showHeadings ? 'Pinned' : undefined} notes={pinned} {...handlers} />
      <Section title={showHeadings ? 'Others' : undefined} notes={others} {...handlers} />
    </>
  )
}
