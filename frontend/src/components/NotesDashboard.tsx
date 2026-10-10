import { useMemo } from 'react'
import type { Note } from '../api/notes'
import { useNotesUI } from '../hooks/useNotesUI'
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '../hooks/useNotes'
import { NoteCard } from './NoteCard'
import { NoteEditorModal } from './NoteEditorModal'
import { SearchBar } from './SearchBar'
import { EmptyState, ErrorBanner, LoadingGrid } from './StatusViews'

const NO_NOTES: Note[] = []

export function NotesDashboard() {
  const { search, openCreate, openEdit } = useNotesUI()
  const notesQuery = useNotes()
  const create = useCreateNote()
  const update = useUpdateNote()
  const remove = useDeleteNote()

  const notes = notesQuery.data ?? NO_NOTES
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    )
  }, [notes, search])

  const handleDelete = (note: Note) => {
    if (window.confirm(`Delete "${note.title}"?`)) remove.mutate(note.id)
  }

  // Surface the most recent failed mutation (the optimistic update has already rolled back).
  const mutationError = [create, update, remove].find((m) => m.isError)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-slate-500">
            {notesQuery.isSuccess && `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBar />
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New note
          </button>
        </div>
      </header>

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
        <EmptyState
          message="You don't have any notes yet."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create your first note
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState message={`No notes match "${search}".`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={remove.isPending && remove.variables === note.id}
            />
          ))}
        </div>
      )}

      <NoteEditorModal />
    </div>
  )
}
