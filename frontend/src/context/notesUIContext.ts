import { createContext } from 'react'

export interface NotesUIContextValue {
  search: string
  setSearch: (value: string) => void
  /** Id of the note open in the editor dialog, if any. */
  openNoteId: number | null
  openNote: (id: number) => void
  closeNote: () => void
}

export const NotesUIContext = createContext<NotesUIContextValue | null>(null)
