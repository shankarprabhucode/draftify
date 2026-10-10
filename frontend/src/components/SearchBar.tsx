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
    <div className="relative w-full sm:w-80">
      <input
        ref={input}
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notes"
        aria-label="Search notes"
        className="w-full rounded-full border border-slate-200 bg-white py-2 pr-14 pl-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-900"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-slate-700">
        ⌘K
      </kbd>
    </div>
  )
}
