import { useLabels } from '../hooks/useLabels'
import { useNotesUI } from '../hooks/useNotesUI'
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

/** Keep-style navigation: Notes, then one entry per label, then Edit labels. */
export function Sidebar() {
  const { sidebarOpen, section, setSection, activeLabelId, setActiveLabelId, setLabelsDialogOpen } = useNotesUI()
  const labels = useLabels()
  const collapsed = !sidebarOpen

  return (
    <nav
      aria-label="Navigation"
      className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 overflow-y-auto py-2 pr-3 transition-[width] duration-200 md:block ${
        collapsed ? 'w-20 px-3' : 'w-64'
      }`}
    >
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
          onClick={() => setLabelsDialogOpen(true)}
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
    </nav>
  )
}
