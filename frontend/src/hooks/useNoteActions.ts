import { useCallback } from 'react'
import { toInput, type Note } from '../api/notes'
import { useDeleteForever, useEmptyTrash, useRestoreNote, useTrashNote, useUpdateNote } from './useNotes'
import { useToast } from './useToast'

/**
 * Keep-style note actions with Undo toasts. Every action applies immediately
 * (optimistically) and the toast's Undo reverses it.
 */
export function useNoteActions() {
  const update = useUpdateNote()
  const trash = useTrashNote()
  const restore = useRestoreNote()
  const deleteForever = useDeleteForever()
  const emptyTrash = useEmptyTrash()
  const toast = useToast()

  const archiveNote = useCallback(
    (note: Note, archived: boolean) => {
      update.mutate({ id: note.id, input: { ...toInput(note), archived } })
      toast.show({
        message: archived ? 'Note archived' : 'Note unarchived',
        action: {
          label: 'Undo',
          onClick: () => update.mutate({ id: note.id, input: { ...toInput(note), archived: !archived } }),
        },
      })
    },
    [update, toast],
  )

  const trashNote = useCallback(
    (note: Note) => {
      trash.mutate(note.id)
      toast.show({
        message: 'Note moved to trash',
        action: { label: 'Undo', onClick: () => restore.mutate(note.id) },
      })
    },
    [trash, restore, toast],
  )

  const restoreNote = useCallback(
    (note: Note) => {
      restore.mutate(note.id)
      toast.show({
        message: 'Note restored',
        action: { label: 'Undo', onClick: () => trash.mutate(note.id) },
      })
    },
    [trash, restore, toast],
  )

  const deleteNoteForever = useCallback(
    (note: Note) => {
      if (window.confirm('Delete this note forever? This cannot be undone.')) deleteForever.mutate(note.id)
    },
    [deleteForever],
  )

  const emptyTheTrash = useCallback(() => {
    if (window.confirm('Empty trash? All notes in the trash will be deleted forever.')) emptyTrash.mutate()
  }, [emptyTrash])

  const failed = [update, trash, restore, deleteForever, emptyTrash].find((m) => m.isError)

  return {
    archiveNote,
    trashNote,
    restoreNote,
    deleteNoteForever,
    emptyTrash: emptyTheTrash,
    error: failed?.error ?? null,
    reset: () => failed?.reset(),
  }
}
