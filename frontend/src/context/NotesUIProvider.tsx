import { useMemo, useState, type ReactNode } from 'react'
import { NotesUIContext, type NotesUIContextValue } from './notesUIContext'

/**
 * Client-only UI state (search text, which note is open) lives in Context.
 * Server state (the notes themselves) lives in TanStack Query.
 */
export function NotesUIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [openNoteId, setOpenNoteId] = useState<number | null>(null)

  const value = useMemo<NotesUIContextValue>(
    () => ({
      search,
      setSearch,
      openNoteId,
      openNote: (id) => setOpenNoteId(id),
      closeNote: () => setOpenNoteId(null),
    }),
    [search, openNoteId],
  )

  return <NotesUIContext.Provider value={value}>{children}</NotesUIContext.Provider>
}
