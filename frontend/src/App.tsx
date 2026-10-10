import { AuthPage } from './components/AuthPage'
import { NotesDashboard } from './components/NotesDashboard'
import { NotesUIProvider } from './context/NotesUIProvider'
import { ToastProvider } from './context/ToastProvider'
import { useSession } from './hooks/useAuth'

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <span aria-hidden="true" className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-[#fbbc04] to-[#f28b82] text-xl font-bold text-[#202124]">
        D
      </span>
    </div>
  )
}

export default function App() {
  const session = useSession()

  if (session.isPending) return <Splash />
  if (session.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-[#5f6368] dark:text-[#9aa0a6]">{session.error.message}</p>
        <button type="button" onClick={() => session.refetch()} className="rounded-md bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white">
          Retry
        </button>
      </div>
    )
  }
  if (!session.data) return <AuthPage />

  return (
    <ToastProvider>
      <NotesUIProvider key={session.data.id}>
        <NotesDashboard user={session.data} />
      </NotesUIProvider>
    </ToastProvider>
  )
}
