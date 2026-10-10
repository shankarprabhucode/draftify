import { createContext } from 'react'

export type ViewMode = 'grid' | 'list'

export interface NotesUIContextValue {
  search: string
  setSearch: (value: string) => void
  /** Id of the note open in the editor dialog, if any. */
  openNoteId: number | null
  openNote: (id: number) => void
  closeNote: () => void
  /** Sidebar label filter; null shows every note. */
  activeLabelId: number | null
  setActiveLabelId: (id: number | null) => void
  view: ViewMode
  setView: (view: ViewMode) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  labelsDialogOpen: boolean
  setLabelsDialogOpen: (open: boolean) => void
}

export const NotesUIContext = createContext<NotesUIContextValue | null>(null)
