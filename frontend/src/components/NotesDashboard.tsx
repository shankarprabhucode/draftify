import { useCallback, useMemo } from 'react'
import type { Note } from '../api/notes'
import { toInput } from '../api/notes'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo'
import { useNotes, useUpdateNote } from '../hooks/useNotes'
import { useNotesUI } from '../hooks/useNotesUI'
import { toPlainText } from '../lib/html'
import { NoteDialog } from './NoteDialog'
import { NotesGrid } from './NotesGrid'
import { QuickCapture } from './QuickCapture'
import { SearchBar } from './SearchBar'
import { EmptyState, ErrorBanner, LoadingGrid } from './StatusViews'
import { Toasts } from './Toasts'

const NO_NOTES: Note[] = []

export function NotesDashboard() {
  const { search, openNoteId, openNote, closeNote } = useNotesUI()
  const notesQuery = useNotes()
  const update = useUpdateNote()
  const { deleteNote, pendingIds, error: deleteError, reset: resetDelete } = useDeleteWithUndo()

  const notes = notesQuery.data ?? NO_NOTES

  // Search over title and the plain text of the HTML content.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const alive = notes.filter((n) => !pendingIds.has(n.id))
    if (!q) return alive
    return alive.filter(
      (n) => n.title.toLowerCase().includes(q) || toPlainText(n.content).toLowerCase().includes(q),
    )
  }, [notes, search, pendingIds])

  const { pinned, others } = useMemo(() => {
    const byRecent = (a: Note, b: Note) => b.updated_at.localeCompare(a.updated_at)
    return {
      pinned: visible.filter((n) => n.pinned).sort(byRecent),
      others: visible.filter((n) => !n.pinned).sort(byRecent),
    }
  }, [visible])

  const openedNote = openNoteId === null ? null : (notes.find((n) => n.id === openNoteId) ?? null)

  const handleOpen = useCallback((note: Note) => openNote(note.id), [openNote])
  const handleTogglePin = useCallback(
    (note: Note) => update.mutate({ id: note.id, input: { ...toInput(note), pinned: !note.pinned } }),
    [update],
  )
  const handleDelete = useCallback((note: Note) => deleteNote(note), [deleteNote])

  const mutationError = update.isError ? update : deleteError ? { error: deleteError, reset: resetDelete } : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Notes
          {notesQuery.isSuccess && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              {visible.length}
              {search && ` of ${notes.length}`}
            </span>
          )}
        </h1>
        <SearchBar />
      </header>

      <div className="mb-8">
        <QuickCapture />
      </div>

      {mutationError && (
        <div className="mb-4">
          <ErrorBanner
            message={mutationError.error?.message ?? 'Something went wrong'}
            onDismiss={() => mutationError.reset()}
          />
        </div>
      )}

      {notesQuery.isPending ? (
        <LoadingGrid />
      ) : notesQuery.isError ? (
        <ErrorBanner message={notesQuery.error.message} onRetry={() => notesQuery.refetch()} />
      ) : notes.length === 0 ? (
        <EmptyState title="No notes yet" hint="Your notes will appear here. Try typing '/' in the editor for headings, lists and more." />
      ) : visible.length === 0 ? (
        <EmptyState title={`No notes match "${search}"`} />
      ) : (
        <NotesGrid
          pinned={pinned}
          others={others}
          onOpen={handleOpen}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
        />
      )}

      {openedNote && <NoteDialog key={openedNote.id} note={openedNote} onClose={closeNote} onDelete={handleDelete} />}
      <Toasts />
    </div>
  )
}
