import { NotesUIProvider } from './context/NotesUIProvider'
import { ToastProvider } from './context/ToastProvider'
import { NotesDashboard } from './components/NotesDashboard'

export default function App() {
  return (
    <ToastProvider>
      <NotesUIProvider>
        <NotesDashboard />
      </NotesUIProvider>
    </ToastProvider>
  )
}
