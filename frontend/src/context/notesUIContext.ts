import { createContext } from 'react'
import type { Note } from '../api/notes'

/** Which editor is open: nothing, the "new note" form, or an existing note. */
export type EditorState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; note: Note }

export interface NotesUIContextValue {
  search: string
  setSearch: (value: string) => void
  editor: EditorState
  openCreate: () => void
  openEdit: (note: Note) => void
  closeEditor: () => void
}

export const NotesUIContext = createContext<NotesUIContextValue | null>(null)
