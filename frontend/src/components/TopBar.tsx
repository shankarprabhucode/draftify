import { useEffect, useRef } from 'react'
import { useNotesUI } from '../hooks/useNotesUI'
import { CloseIcon, GridIcon, ListIcon, MenuIcon, SearchIcon } from './icons'
import { IconButton } from './IconButton'

export function TopBar() {
  const { search, setSearch, toggleSidebar, view, setView } = useNotesUI()
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-black/10 bg-white px-2 sm:px-4 dark:border-white/10 dark:bg-[#202124]">
      <IconButton label="Toggle navigation" onClick={toggleSidebar} className="h-12 w-12">
        <MenuIcon />
      </IconButton>
      <a href="/" className="mr-2 flex items-center gap-2 rounded-md px-1 py-1 sm:mr-6">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#fbbc04] to-[#f28b82] text-base font-bold text-[#202124]">
          D
        </span>
        <span className="hidden text-[22px] text-[#5f6368] sm:block dark:text-[#e8eaed]">Draftify</span>
      </a>

      <div className="relative flex h-12 min-w-0 flex-1 items-center rounded-lg bg-[#f1f3f4] transition focus-within:bg-white focus-within:shadow-[0_1px_1px_0_rgba(65,69,73,.3),0_1px_3px_1px_rgba(65,69,73,.15)] sm:max-w-2xl dark:bg-[#525355] dark:focus-within:bg-[#525355]">
        <span className="pointer-events-none absolute left-3 text-[#5f6368] dark:text-[#e8eaed]">
          <SearchIcon />
        </span>
        <input
          ref={input}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          aria-label="Search notes"
          className="h-full w-full bg-transparent pr-10 pl-12 text-base outline-none placeholder:text-[#5f6368] dark:placeholder:text-[#e8eaed]/70"
        />
        {search && (
          <IconButton label="Clear search" onClick={() => setSearch('')} className="absolute right-1">
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <div className="ml-auto flex items-center">
        <IconButton
          label={view === 'grid' ? 'List view' : 'Grid view'}
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          className="h-12 w-12"
        >
          {view === 'grid' ? <ListIcon /> : <GridIcon />}
        </IconButton>
      </div>
    </header>
  )
}
