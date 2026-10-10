import { useMemo, useState, type ReactNode } from 'react'
import type { Section } from '../api/notes'
import { NotesUIContext, type NotesUIContextValue, type ViewMode } from './notesUIContext'

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback
  } catch {
    return fallback
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable (private mode); the preference is cosmetic.
  }
}

/**
 * Client-only UI state (search, open note, sidebar, filters) lives in Context.
 * Server state (notes and labels) lives in TanStack Query.
 */
export function NotesUIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [openNoteId, setOpenNoteId] = useState<number | null>(null)
  const [activeLabelId, setActiveLabelIdState] = useState<number | null>(null)
  const [section, setSectionState] = useState<Section>('notes')
  const [view, setViewState] = useState<ViewMode>(() => readPref('draftify.view', 'grid'))
  const [sidebarOpen, setSidebarOpen] = useState(() => readPref('draftify.sidebar', 'open') === 'open')
  const [labelsDialogOpen, setLabelsDialogOpen] = useState(false)

  const value = useMemo<NotesUIContextValue>(
    () => ({
      search,
      setSearch,
      openNoteId,
      openNote: (id) => setOpenNoteId(id),
      closeNote: () => setOpenNoteId(null),
      section,
      setSection: (next) => {
        setSectionState(next)
        setActiveLabelIdState(null)
      },
      activeLabelId,
      setActiveLabelId: (id) => {
        setActiveLabelIdState(id)
        if (id !== null) setSectionState('notes')
      },
      view,
      setView: (v) => {
        setViewState(v)
        writePref('draftify.view', v)
      },
      sidebarOpen,
      toggleSidebar: () =>
        setSidebarOpen((open) => {
          writePref('draftify.sidebar', open ? 'closed' : 'open')
          return !open
        }),
      labelsDialogOpen,
      setLabelsDialogOpen,
    }),
    [search, openNoteId, section, activeLabelId, view, sidebarOpen, labelsDialogOpen],
  )

  return <NotesUIContext.Provider value={value}>{children}</NotesUIContext.Provider>
}
