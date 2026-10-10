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

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

/** Full editor for an existing note. Changes autosave; Save flushes immediately. */
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
        if (showColors) setShowColors(false)
        else onClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, showColors])

  const saveState: SaveState = update.isPending ? 'saving' : dirty ? 'dirty' : 'saved'
  const status = update.isError
    ? 'Could not save, will retry on next change'
    : `Edited ${formatRelative(note.updated_at)}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title || 'Untitled note'}
        className={`flex max-h-[92vh] w-full max-w-3xl animate-rise flex-col overflow-hidden rounded-3xl border shadow-2xl ${colorStyles[draft.color].surface}`}
      >
        {/* Header: title + close */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-1 sm:px-8">
          <input
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Untitled"
            maxLength={200}
            aria-label="Title"
            className="min-w-0 flex-1 bg-transparent text-[26px] leading-tight font-bold tracking-tight outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
          <IconButton label="Close" onClick={onClose} className="-mr-2 shrink-0">
            <CloseIcon />
          </IconButton>
        </div>

        {/* Body: toolbar + scrolling editor */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6 sm:px-8">
          <RichTextEditor
            content={draft.content}
            onChange={(content) => change({ content })}
            placeholder="Write something… type '/' for blocks"
            minHeight="16rem"
            toolbar
          />
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-900/8 px-4 py-2.5 sm:px-6 dark:border-white/10">
          <div className="relative flex items-center gap-0.5">
            <IconButton label="Change colour" active={showColors} onClick={() => setShowColors((s) => !s)}>
              <PaletteIcon />
            </IconButton>
            {showColors && (
              <div className="absolute bottom-11 left-0 z-10 animate-rise rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800">
                <ColorPicker
                  value={draft.color}
                  onChange={(color) => {
                    change({ color }, true)
                    setShowColors(false)
                  }}
                />
              </div>
            )}
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
            <span className="ml-2 hidden text-[11px] text-slate-400 md:inline">
              <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">/</kbd> blocks ·{' '}
              <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">⌘S</kbd> save ·{' '}
              <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">Esc</kbd> close
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              className={`hidden text-xs sm:inline ${update.isError ? 'text-red-600' : 'text-slate-400'}`}
            >
              {status}
            </span>
            <SaveButton state={saveState} onClick={save} />
          </div>
        </footer>
      </div>
    </div>
  )
}
