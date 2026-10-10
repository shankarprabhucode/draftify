import { useMemo, useState, type ReactNode } from 'react'
import { NotesUIContext, type EditorState, type NotesUIContextValue } from './notesUIContext'

/**
 * Client-only UI state (search text, open editor) lives in Context.
 * Server state (the notes themselves) lives in TanStack Query.
 */
export function NotesUIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })

  const value = useMemo<NotesUIContextValue>(
    () => ({
      search,
      setSearch,
      editor,
      openCreate: () => setEditor({ mode: 'create' }),
      openEdit: (note) => setEditor({ mode: 'edit', note }),
      closeEditor: () => setEditor({ mode: 'closed' }),
    }),
    [search, editor],
  )

  return <NotesUIContext.Provider value={value}>{children}</NotesUIContext.Provider>
}
