import { useCallback, useEffect, useRef, useState } from 'react'
import { toInput, type Note, type NoteInput } from '../api/notes'
import { useUpdateNote } from '../hooks/useNotes'
import { colorStyles } from '../lib/colors'
import { formatRelative } from '../lib/time'
import { RichTextEditor } from '../editor/RichTextEditor'
import { ColorPicker } from './ColorPicker'
import { IconButton, PaletteIcon, PinIcon, TrashIcon } from './IconButton'
import { SaveButton, type SaveState } from './SaveButton'

const AUTOSAVE_MS = 600

interface NoteDialogProps {
  note: Note
  onClose: () => void
  onDelete: (note: Note) => void
}

/** Full editor for an existing note. Changes autosave; there is no Save button. */
export function NoteDialog({ note, onClose, onDelete }: NoteDialogProps) {
  const update = useUpdateNote()
  const [draft, setDraft] = useState<NoteInput>(() => toInput(note))
  const [dirty, setDirty] = useState(false)
  const [showColors, setShowColors] = useState(false)
  // Mirrors of draft/dirty for the save callback, written only from event handlers.
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Saves are serialised: while one request is in flight, further changes are
  // queued and sent once it settles, so responses can never apply out of order.
  const inFlight = useRef(false)
  const queued = useRef(false)
  const mutate = update.mutate
  // Latest save function, so the settle handler and the unmount flush never go stale.
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

  // Flush unsaved changes when the dialog unmounts (the ref keeps the effect
  // from re-running, and so re-flushing, on every render).
  useEffect(() => {
    saveRef.current = save
  }, [save])
  useEffect(() => () => saveRef.current(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveState: SaveState = update.isPending ? 'saving' : dirty ? 'dirty' : 'saved'
  const status = update.isError ? 'Could not save, will retry on next change' : `Edited ${formatRelative(note.updated_at)}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title || 'Untitled note'}
        className={`flex w-full max-w-3xl animate-rise flex-col rounded-2xl border shadow-2xl ${colorStyles[draft.color].surface}`}
      >
        <div className="flex-1 px-6 pt-5 pb-2">
          <input
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Title"
            maxLength={200}
            aria-label="Title"
            className="mb-3 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-slate-400"
          />
          <RichTextEditor
            content={draft.content}
            onChange={(content) => change({ content })}
            placeholder="Write something… type '/' for blocks"
            minHeight="12rem"
            className="max-h-[60vh] overflow-y-auto"
          />
        </div>

        {showColors && (
          <div className="px-6 pb-2">
            <ColorPicker value={draft.color} onChange={(color) => change({ color }, true)} />
          </div>
        )}

        <footer className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-1">
            <IconButton label="Change colour" active={showColors} onClick={() => setShowColors((s) => !s)}>
              <PaletteIcon />
            </IconButton>
            <IconButton
              label={draft.pinned ? 'Unpin note' : 'Pin note'}
              active={draft.pinned}
              onClick={() => change({ pinned: !draft.pinned }, true)}
            >
              <PinIcon filled={draft.pinned} />
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
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`hidden text-xs sm:inline ${update.isError ? 'text-red-600' : 'text-slate-500'}`}
            >
              {status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Close
            </button>
            <SaveButton state={saveState} onClick={save} />
          </div>
        </footer>
      </div>
    </div>
  )
}
