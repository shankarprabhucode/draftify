import { NotesUIProvider } from './context/NotesUIProvider'
import { NotesDashboard } from './components/NotesDashboard'

export default function App() {
  return (
    <NotesUIProvider>
      <NotesDashboard />
    </NotesUIProvider>
  )
}
