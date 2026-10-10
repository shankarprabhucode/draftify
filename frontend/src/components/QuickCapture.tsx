import { useEffect, useRef, useState } from 'react'
import { emptyNoteInput, type NoteInput } from '../api/notes'
import { useCreateNote } from '../hooks/useNotes'
import { colorStyles } from '../lib/colors'
import { isBlank } from '../lib/html'
import { RichTextEditor } from '../editor/RichTextEditor'
import { ColorPicker } from './ColorPicker'
import { IconButton, PaletteIcon, PencilIcon, PinIcon } from './IconButton'
import { SaveButton, Spinner } from './SaveButton'

/**
 * Keep-style capture box. Collapsed it is a single line; clicking expands it
 * into a title field and rich editor. Closing saves the note if it has content.
 */
export function QuickCapture() {
  const create = useCreateNote()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NoteInput>(emptyNoteInput)
  const [showColors, setShowColors] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const hasContent = draft.title.trim().length > 0 || !isBlank(draft.content)

  const reset = () => {
    setDraft(emptyNoteInput)
    setShowColors(false)
    setOpen(false)
  }

  /** Save if there is anything to save, then collapse. Clicking outside does the same. */
  const close = () => {
    if (hasContent) create.mutate({ ...draft, title: draft.title.trim() })
    reset()
  }

  // Click outside closes (and saves) the capture box.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (box.current?.contains(target)) return
      if ((target as Element).closest?.('.slash-menu')) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-500 shadow-card transition hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
      >
        <span className="flex items-center gap-3">
          <PencilIcon />
          Take a note…
        </span>
        {create.isPending && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400" aria-live="polite">
            <Spinner /> Saving…
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      ref={box}
      className={`mx-auto w-full max-w-xl animate-rise rounded-2xl border p-4 shadow-card-hover ${colorStyles[draft.color].surface}`}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder="Title"
        maxLength={200}
        aria-label="Title"
        className="mb-2 w-full bg-transparent text-lg font-semibold outline-none placeholder:text-slate-400"
      />
      <RichTextEditor
        content={draft.content}
        onChange={(content) => setDraft((d) => ({ ...d, content }))}
        minHeight="4rem"
      />
      {showColors && (
        <div className="mt-3">
          <ColorPicker value={draft.color} onChange={(color) => setDraft((d) => ({ ...d, color }))} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconButton label="Change colour" active={showColors} onClick={() => setShowColors((s) => !s)}>
            <PaletteIcon />
          </IconButton>
          <IconButton
            label={draft.pinned ? 'Unpin' : 'Pin'}
            active={draft.pinned}
            onClick={() => setDraft((d) => ({ ...d, pinned: !d.pinned }))}
          >
            <PinIcon filled={draft.pinned} />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-900/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Discard
          </button>
          <SaveButton state={hasContent ? 'dirty' : 'empty'} onClick={close} />
        </div>
      </div>
    </div>
  )
}
