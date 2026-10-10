import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notesApi, type Note, type NoteInput } from '../api/notes'

export const notesKey = ['notes'] as const

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

  return { snapshot, rollback, settle, patch }
}

export function useCreateNote() {
  const { snapshot, rollback, settle, patch } = useOptimisticNotes()
  return useMutation({
    mutationFn: notesApi.create,
    onMutate: async (input: NoteInput) => {
      const previous = await snapshot()
      // Negative temporary id so it can't collide with server ids.
      patch((notes) => [
        ...notes,
        { id: -Date.now(), updated_at: new Date().toISOString(), ...input },
      ])
      return { previous }
    },
    onError: (_err, _input, ctx) => ctx && rollback(ctx.previous),
    onSettled: settle,
  })
}

export function useUpdateNote() {
  const { snapshot, rollback, settle, patch } = useOptimisticNotes()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NoteInput }) => notesApi.update(id, input),
    onMutate: async ({ id, input }) => {
      const previous = await snapshot()
      patch((notes) =>
        notes.map((n) =>
          n.id === id ? { ...n, ...input, updated_at: new Date().toISOString() } : n,
        ),
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
