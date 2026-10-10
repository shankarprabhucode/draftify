/** Small outline icons (24px viewBox, 2px stroke), Keep-ish. */

const base = (className: string) => ({
  viewBox: '0 0 24 24',
  className,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

type P = { className?: string }

export const MenuIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const SearchIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const NotesIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.8l.1.3h4.8l.1-.3c.1-.7.4-1.3 1-1.8A6 6 0 0 0 12 3z" /></svg>
)
export const LabelIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><path d="M3 7a2 2 0 0 1 2-2h8.6a2 2 0 0 1 1.6.8L21 12l-5.8 6.2a2 2 0 0 1-1.6.8H5a2 2 0 0 1-2-2V7z" /></svg>
)
export const EditIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
)
export const GridIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
)
export const ListIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" /></svg>
)
export const CheckSquareIcon = ({ className = 'h-5 w-5' }: P) => (
  <svg {...base(className)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m8 12 3 3 5-6" /></svg>
)
export const PinIcon = ({ filled = false, className = 'h-4 w-4' }: P & { filled?: boolean }) => (
  <svg {...base(className)} fill={filled ? 'currentColor' : 'none'}><path d="M12 17v5M9 3h6l1 7 2 2H6l2-2 1-7z" /></svg>
)
export const TrashIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
)
export const PaletteIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="15.5" cy="10" r="1" /><path d="M12 21c-1.5 0-2-1-2-2a2 2 0 0 1 2-2h2a3 3 0 0 0 0-6" /></svg>
)
export const CloseIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const PlusIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>
)
export const CheckIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M5 13l4 4L19 7" /></svg>
)
export const ArchiveIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M3 7h18M5 7l1 13h12l1-13M4 4h16v3H4zM10 12h4" /></svg>
)
export const UnarchiveIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M3 7h18M5 7l1 13h12l1-13M4 4h16v3H4zM12 17v-6m-3 3 3-3 3 3" /></svg>
)
export const RestoreIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2" /></svg>
)
export const DeleteForeverIcon = ({ className = 'h-4 w-4' }: P) => (
  <svg {...base(className)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11l4 5M14 11l-4 5" /></svg>
)
export const PencilIcon = EditIcon
