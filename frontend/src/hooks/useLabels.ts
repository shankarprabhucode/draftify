import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { labelsApi, type Label } from '../api/notes'
import { labelsKey, notesKey } from './keys'

export { labelsKey } from './keys'

export function useLabels() {
  return useQuery({ queryKey: labelsKey, queryFn: labelsApi.list, staleTime: 60_000 })
}

/** Label changes affect notes too (names on chips, removed links), so both refetch. */
function useRefreshBoth() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: labelsKey })
    qc.invalidateQueries({ queryKey: notesKey })
  }
}

export function useCreateLabel() {
  const qc = useQueryClient()
  const refresh = useRefreshBoth()
  return useMutation({
    mutationFn: labelsApi.create,
    onSuccess: (label) =>
      qc.setQueryData<Label[]>(labelsKey, (old = []) =>
        [...old, label].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      ),
    onSettled: refresh,
  })
}

export function useRenameLabel() {
  const refresh = useRefreshBoth()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => labelsApi.rename(id, name),
    onSettled: refresh,
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  const refresh = useRefreshBoth()
  return useMutation({
    mutationFn: labelsApi.remove,
    onMutate: (id) =>
      qc.setQueryData<Label[]>(labelsKey, (old = []) => old.filter((l) => l.id !== id)),
    onSettled: refresh,
  })
}
