import { useCallback, useState } from 'react'
import type { Note } from '../api/notes'
import { useDeleteNote } from './useNotes'
import { useToast } from './useToast'

/**
 * Keep-style delete: the note disappears immediately and a toast offers Undo.
 * The DELETE request is only sent when the toast expires.
 */
export function useDeleteWithUndo() {
  const remove = useDeleteNote()
  const toast = useToast()
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set())

  const deleteNote = useCallback(
    (note: Note) => {
      setPendingIds((ids) => new Set(ids).add(note.id))
      const restore = () => setPendingIds((ids) => {
        const next = new Set(ids)
        next.delete(note.id)
        return next
      })
      toast.show({
        message: 'Note deleted',
        action: { label: 'Undo', onClick: restore },
        onExpire: () => {
          restore()
          remove.mutate(note.id)
        },
      })
    },
    [remove, toast],
  )

  return { deleteNote, pendingIds, error: remove.error, reset: remove.reset }
}
