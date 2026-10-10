import { useEffect, useRef } from 'react'
import { useNotesUI } from '../hooks/useNotesUI'

export function SearchBar() {
  const { search, setSearch } = useNotesUI()
  const input = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl+K focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative w-44 transition-[width] duration-200 focus-within:w-72 sm:w-56 sm:focus-within:w-80">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notes"
        aria-label="Search notes"
        className="w-full rounded-full border border-transparent bg-slate-200/60 py-2 pr-14 pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:bg-slate-800/80 dark:focus:bg-slate-900 dark:focus:ring-indigo-950"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-slate-700">
        ⌘K
      </kbd>
    </div>
  )
}
