import { createContext } from 'react'
import type { Section } from '../api/notes'

export type ViewMode = 'grid' | 'list'

export interface NotesUIContextValue {
  search: string
  setSearch: (value: string) => void
  /** Id of the note open in the editor dialog, if any. */
  openNoteId: number | null
  openNote: (id: number) => void
  closeNote: () => void
  /** Notes, Archive or Trash. */
  section: Section
  setSection: (section: Section) => void
  /** Sidebar label filter; null shows every note. Selecting a label returns to Notes. */
  activeLabelId: number | null
  setActiveLabelId: (id: number | null) => void
  view: ViewMode
  setView: (view: ViewMode) => void
  /** Desktop: inline sidebar expanded or collapsed to icons. */
  sidebarOpen: boolean
  toggleSidebar: () => void
  /** Phones: the sidebar as a slide-in drawer. */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  labelsDialogOpen: boolean
  setLabelsDialogOpen: (open: boolean) => void
}

export const NotesUIContext = createContext<NotesUIContextValue | null>(null)
