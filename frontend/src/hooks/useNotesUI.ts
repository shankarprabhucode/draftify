import { useContext } from 'react'
import { NotesUIContext, type NotesUIContextValue } from '../context/notesUIContext'

export function useNotesUI(): NotesUIContextValue {
  const ctx = useContext(NotesUIContext)
  if (!ctx) throw new Error('useNotesUI must be used inside <NotesUIProvider>')
  return ctx
}
