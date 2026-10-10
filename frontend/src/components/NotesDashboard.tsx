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

  // Pinned first, then most recently edited.
  const sorted = useMemo(
    () =>
      [...visible].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at),
      ),
    [visible],
  )

  const openedNote = openNoteId === null ? null : (notes.find((n) => n.id === openNoteId) ?? null)

  const handleOpen = useCallback((note: Note) => openNote(note.id), [openNote])
  const handleTogglePin = useCallback(
    (note: Note) => update.mutate({ id: note.id, input: { ...toInput(note), pinned: !note.pinned } }),
    [update],
  )
  const handleDelete = useCallback((note: Note) => deleteNote(note), [deleteNote])

  const mutationError = update.isError ? update : deleteError ? { error: deleteError, reset: resetDelete } : null

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <h1 className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm text-white shadow-sm">
              D
            </span>
            Draftify
            {notesQuery.isSuccess && (
              <span className="ml-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400" aria-live="polite">
                {visible.length}
                {search ? ` / ${notes.length}` : ''}
              </span>
            )}
          </h1>
          <SearchBar />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
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
          notes={sorted}
          onOpen={handleOpen}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
        />
      )}
      </main>

      {openedNote && <NoteDialog key={openedNote.id} note={openedNote} onClose={closeNote} onDelete={handleDelete} />}
      <Toasts />
    </div>
  )
}
