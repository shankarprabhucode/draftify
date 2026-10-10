import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notesApi, toInput, type Label, type Note, type NoteInput } from '../api/notes'
import { topPosition } from '../lib/order'
import { labelsKey, notesKey } from './keys'

export { notesKey } from './keys'

export function useNotes() {
  return useQuery({ queryKey: notesKey, queryFn: notesApi.list })
}

/**
 * Each mutation applies an optimistic update to the cached list, rolls back on
 * error, and refetches on settle so the cache matches the server.
 */
function useOptimisticNotes() {
  const queryClient = useQueryClient()

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: notesKey })
    return queryClient.getQueryData<Note[]>(notesKey) ?? []
  }
  const rollback = (previous: Note[]) => queryClient.setQueryData(notesKey, previous)
  const settle = () => queryClient.invalidateQueries({ queryKey: notesKey })
  const patch = (updater: (notes: Note[]) => Note[]) =>
    queryClient.setQueryData<Note[]>(notesKey, (old = []) => updater(old))

  /** Turn an input (label ids) into note fields (label objects) using the labels cache. */
  const fields = (input: NoteInput): Omit<Note, 'id' | 'position' | 'updated_at'> => {
    const all = queryClient.getQueryData<Label[]>(labelsKey) ?? []
    const { label_ids, ...rest } = input
    return { ...rest, labels: all.filter((l) => label_ids.includes(l.id)) }
  }

  return { snapshot, rollback, settle, patch, fields }
}

export function useCreateNote() {
  const { snapshot, rollback, settle, patch, fields } = useOptimisticNotes()
  return useMutation({
    mutationFn: notesApi.create,
    onMutate: async (input: NoteInput) => {
      const previous = await snapshot()
      // Negative temporary id so it can't collide with server ids.
      patch((notes) => [
        ...notes,
        { id: -Date.now(), position: topPosition(notes), updated_at: new Date().toISOString(), ...fields(input) },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => ctx && rollback(ctx.previous),
    onSettled: settle,
  })
}

export function useUpdateNote() {
  const { snapshot, rollback, settle, patch, fields } = useOptimisticNotes()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NoteInput }) => notesApi.update(id, input),
    onMutate: async ({ id, input }) => {
      const previous = await snapshot()
      patch((notes) =>
        notes.map((n) => {
          if (n.id !== id) return n
          // Pinning or unpinning moves the note to the top of its new group.
          const position = input.pinned !== n.pinned ? topPosition(notes) : n.position
          return { ...n, ...fields(input), position, updated_at: new Date().toISOString() }
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => ctx && rollback(ctx.previous),
    onSettled: settle,
  })
}

export function useDeleteNote() {
  const { snapshot, rollback, settle, patch } = useOptimisticNotes()
  return useMutation({
    mutationFn: notesApi.remove,
    onMutate: async (id: number) => {
      const previous = await snapshot()
      patch((notes) => notes.filter((n) => n.id !== id))
      return { previous }
    },
    onError: (_err, _id, ctx) => ctx && rollback(ctx.previous),
    onSettled: settle,
  })
}

export interface MoveNoteVars {
  /** Every note id in the new display order. */
  ids: number[]
  /** Set when the drop also changes the note's pinned state. */
  pin?: { note: Note; pinned: boolean }
}

/**
 * Drag-and-drop move. If the drop crosses the pinned boundary the pin change is
 * sent first, then the full order, so the server never reorders a stale note.
 */
export function useMoveNote() {
  const { snapshot, rollback, settle, patch } = useOptimisticNotes()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, pin }: MoveNoteVars) => {
      if (pin) await notesApi.update(pin.note.id, { ...toInput(pin.note), pinned: pin.pinned })
      return notesApi.reorder(ids)
    },
    onMutate: async ({ ids, pin }) => {
      const previous = await snapshot()
      patch((notes) =>
        notes.map((n) => ({
          ...n,
          pinned: pin && n.id === pin.note.id ? pin.pinned : n.pinned,
          position: ids.includes(n.id) ? ids.indexOf(n.id) : n.position,
        })),
      )
      return { previous }
    },
    onSuccess: (notes) => queryClient.setQueryData(notesKey, notes),
    onError: (_err, _vars, ctx) => ctx && rollback(ctx.previous),
    onSettled: settle,
  })
}
