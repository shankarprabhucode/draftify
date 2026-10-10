import { useNotesUI } from '../hooks/useNotesUI'

export function SearchBar() {
  const { search, setSearch } = useNotesUI()
  return (
    <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search notes…"
      aria-label="Search notes"
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-72"
    />
  )
}
