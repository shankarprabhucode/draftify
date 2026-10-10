import { memo, useMemo, useState } from 'react'
import { sectionOf, type Label, type Note, type NoteInput } from '../api/notes'
import { colorStyles } from '../lib/colors'
import { sanitize } from '../lib/html'
import { ColorPicker } from './ColorPicker'
import { IconButton } from './IconButton'
import { LabelChips } from './LabelChips'
import { LabelPicker } from './LabelPicker'
import { Popover } from './Popover'
import {
  ArchiveIcon, DeleteForeverIcon, LabelIcon, PaletteIcon, PinIcon, RestoreIcon, TrashIcon, UnarchiveIcon,
} from './icons'
import { Spinner } from './SaveButton'

export interface NoteCardProps {
  note: Note
  onOpen: (note: Note) => void
  /** Partial update (colour, pin, labels) from the card's own controls. */
  onPatch: (note: Note, patch: Partial<NoteInput>) => void
  onArchive: (note: Note, archived: boolean) => void
  /** Move to trash (from Notes/Archive) or delete forever (from Trash). */
  onDelete: (note: Note) => void
  onRestore: (note: Note) => void
  onLabelClick?: (label: Label) => void
}

export const NoteCard = memo(function NoteCard({
  note, onOpen, onPatch, onArchive, onDelete, onRestore, onLabelClick,
}: NoteCardProps) {
  const section = sectionOf(note)
  const pendingCreate = note.id < 0
  const html = useMemo(() => sanitize(note.content), [note.content])
  const untitled = !note.title.trim()
  const [menu, setMenu] = useState<'color' | 'label' | null>(null)
  const open = menu !== null

  return (
    <article
      aria-busy={pendingCreate}
      className={`group relative rounded-lg border transition-shadow duration-150 ${colorStyles[note.color].surface} ${
        open ? 'shadow-keep' : 'hover:shadow-keep'
      } ${pendingCreate ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpen(note)}
        disabled={pendingCreate}
        aria-label={`Open note ${untitled ? 'untitled' : note.title}`}
        className="block w-full cursor-default rounded-lg px-4 pt-3 pb-2 text-left"
      >
        {!untitled && (
          <h3 className="mb-1.5 pr-8 text-base leading-snug font-medium text-[#202124] dark:text-[#e8eaed]">
            {note.title}
          </h3>
        )}
        {html ? (
          <div className="rich-text note-preview max-h-80 overflow-hidden" dangerouslySetInnerHTML={{ __html: html }} />
        ) : untitled ? (
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Empty note</p>
        ) : null}
        {note.labels.length > 0 && (
          <div className="mt-3">
            <LabelChips labels={note.labels} onClick={section === 'trash' ? undefined : onLabelClick} />
          </div>
        )}
      </button>

      {section === 'notes' && (
        <div className="absolute top-1.5 right-1.5">
          <IconButton
            label={note.pinned ? 'Unpin note' : 'Pin note'}
            active={note.pinned}
            onClick={() => onPatch(note, { pinned: !note.pinned })}
            disabled={pendingCreate}
            className={note.pinned ? '' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}
          >
            <PinIcon filled={note.pinned} />
          </IconButton>
        </div>
      )}

      {/* Keep-style hover toolbar */}
      <div
        className={`flex h-10 items-center gap-0.5 px-2 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        {pendingCreate ? (
          <span className="flex items-center gap-1.5 px-2 text-[11px] text-[#5f6368]" aria-live="polite">
            <Spinner className="h-3 w-3" /> Saving…
          </span>
        ) : section === 'trash' ? (
          <>
            <IconButton label="Restore note" onClick={() => onRestore(note)}>
              <RestoreIcon />
            </IconButton>
            <IconButton label="Delete forever" onClick={() => onDelete(note)}>
              <DeleteForeverIcon />
            </IconButton>
          </>
        ) : (
          <>
            <div className="relative">
              <IconButton label="Change colour" active={menu === 'color'} onClick={() => setMenu(menu === 'color' ? null : 'color')}>
                <PaletteIcon />
              </IconButton>
              <Popover open={menu === 'color'} onClose={() => setMenu(null)}>
                <ColorPicker
                  value={note.color}
                  onChange={(color) => {
                    onPatch(note, { color })
                    setMenu(null)
                  }}
                />
              </Popover>
            </div>
            <div className="relative">
              <IconButton label="Label note" active={menu === 'label'} onClick={() => setMenu(menu === 'label' ? null : 'label')}>
                <LabelIcon className="h-4 w-4" />
              </IconButton>
              <Popover open={menu === 'label'} onClose={() => setMenu(null)}>
                <LabelPicker
                  selectedIds={note.labels.map((l) => l.id)}
                  onChange={(label_ids) => onPatch(note, { label_ids })}
                />
              </Popover>
            </div>
            {section === 'archive' ? (
              <IconButton label="Unarchive note" onClick={() => onArchive(note, false)}>
                <UnarchiveIcon />
              </IconButton>
            ) : (
              <IconButton label="Archive note" onClick={() => onArchive(note, true)}>
                <ArchiveIcon />
              </IconButton>
            )}
            <IconButton label="Delete note" onClick={() => onDelete(note)}>
              <TrashIcon />
            </IconButton>
          </>
        )}
      </div>
    </article>
  )
})
