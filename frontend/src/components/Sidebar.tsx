import { useEffect } from 'react'
import { useLabels } from '../hooks/useLabels'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useNotesUI } from '../hooks/useNotesUI'
import { CloseIcon } from './icons'
import { IconButton } from './IconButton'
import { ArchiveIcon, EditIcon, LabelIcon, NotesIcon, TrashIcon } from './icons'
import { Tooltip } from './Tooltip'

interface ItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}

function Item({ icon, label, active, collapsed, onClick }: ItemProps) {
  const button = (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? label : undefined}
        className={`flex h-12 w-full items-center gap-5 rounded-r-full pl-6 text-left text-sm font-medium transition ${
          active
            ? 'bg-[#feefc3] text-[#202124] dark:bg-[#41331c] dark:text-[#e8eaed]'
            : 'text-[#202124] hover:bg-black/6 dark:text-[#e8eaed] dark:hover:bg-white/8'
        } ${collapsed ? 'w-12 justify-center rounded-full pl-0' : ''}`}
      >
        <span className="shrink-0 text-[#5f6368] dark:text-[#e8eaed]">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
  )
  return <li>{collapsed ? <Tooltip label={label} placement="right">{button}</Tooltip> : button}</li>
}

/** The navigation list itself; shared by the desktop sidebar and the phone drawer. */
function NavItems({ collapsed }: { collapsed: boolean }) {
  const { section, setSection, activeLabelId, setActiveLabelId, setLabelsDialogOpen, setDrawerOpen } = useNotesUI()
  const labels = useLabels()
  return (
    <>
      <ul className="space-y-0.5">
        <Item
          icon={<NotesIcon />}
          label="Notes"
          active={section === 'notes' && activeLabelId === null}
          collapsed={collapsed}
          onClick={() => setSection('notes')}
        />
      </ul>
      {!collapsed && (
        <p className="mt-4 mb-1 pl-6 text-[11px] font-medium tracking-wide text-[#5f6368] uppercase dark:text-[#9aa0a6]">
          Labels
        </p>
      )}
      {collapsed && <div className="my-2 border-t border-black/10 dark:border-white/10" />}
      <ul className="space-y-0.5">
        {(labels.data ?? []).map((label) => (
          <Item
            key={label.id}
            icon={<LabelIcon />}
            label={label.name}
            active={activeLabelId === label.id}
            collapsed={collapsed}
            onClick={() => setActiveLabelId(label.id)}
          />
        ))}
        <Item
          icon={<EditIcon />}
          label="Edit labels"
          active={false}
          collapsed={collapsed}
          onClick={() => {
            setDrawerOpen(false)
            setLabelsDialogOpen(true)
          }}
        />
      </ul>
      <ul className="mt-2 space-y-0.5 border-t border-black/10 pt-2 dark:border-white/10">
        <Item
          icon={<ArchiveIcon className="h-5 w-5" />}
          label="Archive"
          active={section === 'archive'}
          collapsed={collapsed}
          onClick={() => setSection('archive')}
        />
        <Item
          icon={<TrashIcon className="h-5 w-5" />}
          label="Trash"
          active={section === 'trash'}
          collapsed={collapsed}
          onClick={() => setSection('trash')}
        />
      </ul>
    </>
  )
}

/**
 * Keep-style navigation. From the `md` breakpoint up it is an inline column
 * that collapses to icons; on phones it is a slide-in drawer opened from the
 * top-bar hamburger.
 */
export function Sidebar() {
  const { sidebarOpen, drawerOpen, setDrawerOpen } = useNotesUI()
  const isDesktop = useIsDesktop()

  // Close the drawer with Escape and when the viewport grows past the breakpoint.
  useEffect(() => {
    if (!drawerOpen) return
    if (isDesktop) {
      setDrawerOpen(false)
      return
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, isDesktop, setDrawerOpen])

  if (isDesktop) {
    const collapsed = !sidebarOpen
    return (
      <nav
        aria-label="Navigation"
        className={`sticky top-16 h-[calc(100vh-4rem)] shrink-0 overflow-y-auto py-2 pr-3 transition-[width] duration-200 ${
          collapsed ? 'w-20 px-3' : 'w-64'
        }`}
      >
        <NavItems collapsed={collapsed} />
      </nav>
    )
  }

  if (!drawerOpen) return null
  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 bg-black/40"
      />
      <nav
        aria-label="Navigation"
        className="animate-slide-in absolute inset-y-0 left-0 flex w-[82vw] max-w-xs flex-col overflow-y-auto bg-white py-2 pr-3 shadow-2xl dark:bg-[#202124]"
      >
        <div className="mb-1 flex items-center justify-between pr-1 pl-5">
          <span className="flex items-center gap-2 text-lg font-medium text-[#5f6368] dark:text-[#e8eaed]">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#fbbc04] to-[#f28b82] text-sm font-bold text-[#202124]">D</span>
            Draftify
          </span>
          <IconButton label="Close navigation" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <NavItems collapsed={false} />
      </nav>
    </div>
  )
}
