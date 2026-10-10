import { useCallback, useMemo } from 'react'
import type { Label, Note, NoteInput } from '../api/notes'
import { toInput } from '../api/notes'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo'
import { useLabels } from '../hooks/useLabels'
import { useMoveNote, useNotes, useUpdateNote } from '../hooks/useNotes'
import { useNotesUI } from '../hooks/useNotesUI'
import { toPlainText } from '../lib/html'
import { sortNotes } from '../lib/order'
import { EditLabelsDialog } from './EditLabelsDialog'
import { NoteDialog } from './NoteDialog'
import { NotesGrid } from './NotesGrid'
import { QuickCapture } from './QuickCapture'
import { Sidebar } from './Sidebar'
import { EmptyState, ErrorBanner, LoadingGrid } from './StatusViews'
import { Toasts } from './Toasts'
import { TopBar } from './TopBar'

const NO_NOTES: Note[] = []

export function NotesDashboard() {
  const {
    search, setSearch, openNoteId, openNote, closeNote,
    activeLabelId, setActiveLabelId, view, sidebarOpen, labelsDialogOpen, setLabelsDialogOpen,
  } = useNotesUI()
  const notesQuery = useNotes()
  const labelsQuery = useLabels()
  const update = useUpdateNote()
  const move = useMoveNote()
  const { deleteNote, pendingIds, error: deleteError, reset: resetDelete } = useDeleteWithUndo()

  const notes = notesQuery.data ?? NO_NOTES
  const activeLabel = activeLabelId === null ? null : (labelsQuery.data ?? []).find((l) => l.id === activeLabelId) ?? null

  // Filter: label from the sidebar, then search over title, text and label names.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notes.filter((n) => {
      if (pendingIds.has(n.id)) return false
      if (activeLabelId !== null && !n.labels.some((l) => l.id === activeLabelId)) return false
      if (!q) return true
      return (
        n.title.toLowerCase().includes(q) ||
        n.labels.some((l) => l.name.toLowerCase().includes(q)) ||
        toPlainText(n.content).toLowerCase().includes(q)
      )
    })
  }, [notes, search, pendingIds, activeLabelId])

  const sorted = useMemo(() => sortNotes(visible), [visible])
  const filtering = search.trim().length > 0 || activeLabelId !== null

  const openedNote = openNoteId === null ? null : (notes.find((n) => n.id === openNoteId) ?? null)

  const handleOpen = useCallback((note: Note) => openNote(note.id), [openNote])
  const handlePatch = useCallback(
    (note: Note, patch: Partial<NoteInput>) => update.mutate({ id: note.id, input: { ...toInput(note), ...patch } }),
    [update],
  )
  const handleDelete = useCallback((note: Note) => deleteNote(note), [deleteNote])
  const handleLabelClick = useCallback((label: Label) => setActiveLabelId(label.id), [setActiveLabelId])

  const mutationError = update.isError
    ? update
    : move.isError
      ? move
      : deleteError
        ? { error: deleteError, reset: resetDelete }
        : null

  const emptyTitle = activeLabel
    ? `No notes with label "${activeLabel.name}"`
    : search
      ? `No notes match "${search}"`
      : 'Notes you add appear here'

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className={`min-w-0 flex-1 px-4 pt-6 pb-32 transition-[padding] sm:px-8 ${sidebarOpen ? '' : 'md:pl-10'}`}>

          {activeLabel && (
            <div className="mx-auto mb-4 flex max-w-6xl items-center gap-2 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
              <span>Label:</span>
              <span className="font-medium text-[#202124] dark:text-[#e8eaed]">{activeLabel.name}</span>
              <button type="button" onClick={() => setActiveLabelId(null)} className="rounded px-2 py-0.5 hover:bg-black/6 dark:hover:bg-white/10">
                Show all
              </button>
            </div>
          )}

          {mutationError && (
            <div className="mb-4">
              <ErrorBanner
                message={mutationError.error?.message ?? 'Something went wrong'}
                onDismiss={() => mutationError.reset()}
              />
            </div>
          )}

          <div className="mx-auto max-w-6xl">
            {notesQuery.isPending ? (
              <LoadingGrid />
            ) : notesQuery.isError ? (
              <ErrorBanner message={notesQuery.error.message} onRetry={() => notesQuery.refetch()} />
            ) : sorted.length === 0 ? (
              <EmptyState
                title={emptyTitle}
                action={
                  filtering ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setActiveLabelId(null)
                      }}
                      className="mt-3 rounded px-3 py-1.5 text-sm font-medium text-[#1a73e8] hover:bg-[#1a73e8]/10"
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <NotesGrid
                notes={sorted}
                list={view === 'list'}
                dragDisabled={filtering}
                onMove={(m) => move.mutate(m)}
                onOpen={handleOpen}
                onPatch={handlePatch}
                onDelete={handleDelete}
                onLabelClick={handleLabelClick}
              />
            )}
          </div>
        </main>
      </div>

      <QuickCapture />
      {openedNote && <NoteDialog key={openedNote.id} note={openedNote} onClose={closeNote} onDelete={handleDelete} />}
      {labelsDialogOpen && <EditLabelsDialog onClose={() => setLabelsDialogOpen(false)} />}
      <Toasts />
    </div>
  )
}
