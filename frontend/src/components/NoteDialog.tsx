import { useCallback, useEffect, useRef, useState } from 'react'
import { sectionOf, toInput, type Note, type NoteInput } from '../api/notes'
import { useUpdateNote } from '../hooks/useNotes'
import { colorStyles } from '../lib/colors'
import { formatRelative } from '../lib/time'
import { RichTextEditor } from '../editor/RichTextEditor'
import { ColorPicker } from './ColorPicker'
import { IconButton } from './IconButton'
import { LabelChips } from './LabelChips'
import { LabelPicker } from './LabelPicker'
import { Popover } from './Popover'
import { SaveButton, type SaveState } from './SaveButton'
import { ArchiveIcon, CloseIcon, DeleteForeverIcon, LabelIcon, PaletteIcon, PinIcon, RestoreIcon, TrashIcon, UnarchiveIcon } from './icons'
import { useLabels } from '../hooks/useLabels'

const AUTOSAVE_MS = 600

interface NoteDialogProps {
  note: Note
  onClose: () => void
  onArchive: (note: Note, archived: boolean) => void
  /** Trash (normal notes) or delete forever (trashed notes). */
  onDelete: (note: Note) => void
  onRestore: (note: Note) => void
}

/** Full editor for an existing note. Changes autosave; Save flushes immediately. */
export function NoteDialog({ note, onClose, onArchive, onDelete, onRestore }: NoteDialogProps) {
  const update = useUpdateNote()
  const section = sectionOf(note)
  const readOnly = section === 'trash'
  const [draft, setDraft] = useState<NoteInput>(() => toInput(note))
  const [dirty, setDirty] = useState(false)
  const [menu, setMenu] = useState<'color' | 'label' | null>(null)
  const labels = useLabels()
  const selectedLabels = (labels.data ?? []).filter((l) => draft.label_ids.includes(l.id))
  // Mirrors of draft/dirty for the save callback, written only from event handlers.
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Saves are serialised: while one request is in flight, further changes are
  // queued and sent once it settles, so responses can never apply out of order.
  const inFlight = useRef(false)
  const queued = useRef(false)
  const mutate = update.mutate
  const saveRef = useRef<() => void>(() => {})

  const save = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!dirtyRef.current) return
    if (inFlight.current) {
      queued.current = true
      return
    }
    dirtyRef.current = false
    setDirty(false)
    inFlight.current = true
    const input = draftRef.current
    mutate(
      { id: note.id, input: { ...input, title: input.title.trim() } },
      {
        onSettled: () => {
          inFlight.current = false
          if (queued.current) {
            queued.current = false
            saveRef.current()
          }
        },
      },
    )
  }, [note.id, mutate])

  const change = (patch: Partial<NoteInput>, immediate = false) => {
    draftRef.current = { ...draftRef.current, ...patch }
    dirtyRef.current = true
    setDraft(draftRef.current)
    setDirty(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(save, immediate ? 0 : AUTOSAVE_MS)
  }

  useEffect(() => {
    saveRef.current = save
  }, [save])
  // Flush unsaved changes when the dialog unmounts.
  useEffect(() => () => saveRef.current(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menu) setMenu(null)
        else onClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, menu])

  const saveState: SaveState = update.isPending ? 'saving' : dirty ? 'dirty' : 'saved'
  const status = update.isError
    ? 'Could not save, will retry on next change'
    : `Edited ${formatRelative(note.updated_at)}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title || 'Untitled note'}
        className={`flex max-h-[92vh] w-full max-w-3xl animate-rise flex-col rounded-lg border shadow-2xl ${colorStyles[draft.color].surface}`}
      >
        {readOnly && (
          <p role="status" className="rounded-t-lg bg-black/6 px-6 py-2 text-center text-xs text-[#3c4043] sm:px-8 dark:bg-white/10 dark:text-[#e8eaed]">
            This note is in the trash. Restore it to edit.
          </p>
        )}
        {/* Header: title + close */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-1 sm:px-8">
          <input
            value={draft.title}
            readOnly={readOnly}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Title"
            maxLength={200}
            aria-label="Title"
            className="min-w-0 flex-1 bg-transparent text-[22px] leading-tight font-medium outline-none placeholder:text-[#80868b]"
          />
          <IconButton label="Close" onClick={onClose} className="-mr-2 shrink-0">
            <CloseIcon />
          </IconButton>
        </div>

        {/* Body: toolbar + scrolling editor */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-4 sm:px-8">
          <RichTextEditor
            content={draft.content}
            onChange={(content) => change({ content })}
            placeholder="Note… type '/' for blocks"
            minHeight="14rem"
            toolbar
            editable={!readOnly}
          />
          {selectedLabels.length > 0 && (
            <div className="mt-4">
              <LabelChips
                labels={selectedLabels}
                onRemove={readOnly ? undefined : (l) => change({ label_ids: draft.label_ids.filter((id) => id !== l.id) }, true)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
          {readOnly ? (
            <div className="flex items-center gap-0.5">
              <IconButton label="Restore note" onClick={() => { onRestore(note); onClose() }}>
                <RestoreIcon />
              </IconButton>
              <IconButton label="Delete forever" onClick={() => { onDelete(note); onClose() }}>
                <DeleteForeverIcon />
              </IconButton>
            </div>
          ) : (
          <div className="flex items-center gap-0.5">
            <div className="relative">
              <IconButton label="Change colour" active={menu === 'color'} onClick={() => setMenu(menu === 'color' ? null : 'color')}>
                <PaletteIcon />
              </IconButton>
              <Popover open={menu === 'color'} onClose={() => setMenu(null)} side="top">
                <ColorPicker
                  value={draft.color}
                  onChange={(color) => {
                    change({ color }, true)
                    setMenu(null)
                  }}
                />
              </Popover>
            </div>
            <div className="relative">
              <IconButton label="Label note" active={menu === 'label'} onClick={() => setMenu(menu === 'label' ? null : 'label')}>
                <LabelIcon className="h-4 w-4" />
              </IconButton>
              <Popover open={menu === 'label'} onClose={() => setMenu(null)} side="top">
                <LabelPicker selectedIds={draft.label_ids} onChange={(label_ids) => change({ label_ids }, true)} />
              </Popover>
            </div>
            {section === 'notes' && (
              <IconButton
                label={draft.pinned ? 'Unpin note' : 'Pin note'}
                active={draft.pinned}
                onClick={() => change({ pinned: !draft.pinned }, true)}
              >
                <PinIcon filled={draft.pinned} />
              </IconButton>
            )}
            <IconButton
              label={section === 'archive' ? 'Unarchive note' : 'Archive note'}
              onClick={() => {
                dirtyRef.current = false
                onArchive(note, section !== 'archive')
                onClose()
              }}
            >
              {section === 'archive' ? <UnarchiveIcon /> : <ArchiveIcon />}
            </IconButton>
            <IconButton
              label="Delete note"
              onClick={() => {
                dirtyRef.current = false
                onDelete(note)
                onClose()
              }}
            >
              <TrashIcon />
            </IconButton>
            <span className="ml-2 hidden text-[11px] text-[#5f6368] md:inline dark:text-[#9aa0a6]">
              <kbd className="rounded border border-black/20 px-1 dark:border-white/30">/</kbd> blocks ·{' '}
              <kbd className="rounded border border-black/20 px-1 dark:border-white/30">⌘S</kbd> save ·{' '}
              <kbd className="rounded border border-black/20 px-1 dark:border-white/30">Esc</kbd> close
            </span>
          </div>
          )}
          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`hidden text-xs sm:inline ${update.isError ? 'text-red-600' : 'text-[#5f6368] dark:text-[#9aa0a6]'}`}
            >
              {status}
            </span>
            {!readOnly && <SaveButton state={saveState} onClick={save} />}
          </div>
        </footer>
      </div>
    </div>
  )
}
