import { useEffect, useRef, useState } from 'react'
import { emptyNoteInput, type Label, type NoteInput } from '../api/notes'
import { useCreateNote } from '../hooks/useNotes'
import { useLabels } from '../hooks/useLabels'
import { colorStyles } from '../lib/colors'
import { isBlank } from '../lib/html'
import { RichTextEditor } from '../editor/RichTextEditor'
import { ColorPicker } from './ColorPicker'
import { IconButton } from './IconButton'
import { LabelChips } from './LabelChips'
import { LabelPicker } from './LabelPicker'
import { Popover } from './Popover'
import { SaveButton, Spinner } from './SaveButton'
import { Tooltip } from './Tooltip'
import { CheckSquareIcon, LabelIcon, PaletteIcon, PinIcon, PlusIcon } from './icons'

const CHECKLIST_SEED =
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>'

/**
 * Note capture. Closed, it is a floating "Take a note" button (plus a checklist
 * shortcut) fixed to the bottom-right. Open, it is a centred modal with a title
 * field and rich editor. Save, Escape or clicking the backdrop creates the note
 * if there is anything to save.
 */
export function QuickCapture() {
  const create = useCreateNote()
  const labels = useLabels()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NoteInput>(emptyNoteInput)
  const [menu, setMenu] = useState<'color' | 'label' | null>(null)
  // "New list" starts with the caret in the first checklist item, not the title.
  const [focusEditor, setFocusEditor] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const hasContent = draft.title.trim().length > 0 || !isBlank(draft.content)
  const selectedLabels: Label[] = (labels.data ?? []).filter((l) => draft.label_ids.includes(l.id))

  const reset = () => {
    setDraft(emptyNoteInput)
    setMenu(null)
    setOpen(false)
  }

  /** Save if there is anything to save, then collapse. Clicking outside does the same. */
  const close = () => {
    if (hasContent) create.mutate({ ...draft, title: draft.title.trim() })
    reset()
  }

  const openWith = (content = '') => {
    setDraft({ ...emptyNoteInput, content })
    setFocusEditor(content.length > 0)
    setOpen(true)
  }

  // Escape saves and closes, unless a popover is open (it handles Escape itself).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !menu && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) {
    return (
      <div className="fixed right-5 bottom-5 z-40 flex items-center gap-3 sm:right-8 sm:bottom-8">
        <Tooltip label="New list" placement="top">
        <button
          type="button"
          onClick={() => openWith(CHECKLIST_SEED)}
          aria-label="New list"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#5f6368] shadow-keep transition hover:bg-[#f1f3f4] dark:border-white/10 dark:bg-[#2d2e30] dark:text-[#e8eaed] dark:hover:bg-[#3c4043]"
        >
          <CheckSquareIcon />
        </button>
        </Tooltip>
        <button
          type="button"
          onClick={() => openWith()}
          className="flex h-14 items-center gap-2 rounded-full bg-[#202124] pr-6 pl-5 text-[15px] font-medium text-white shadow-fab transition hover:bg-black dark:bg-[#e8eaed] dark:text-[#202124] dark:hover:bg-white"
        >
          {create.isPending ? <Spinner className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
          <span aria-live="polite">{create.isPending ? 'Saving…' : 'Take a note'}</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label="New note"
      className={`flex max-h-[92vh] w-full max-w-2xl animate-rise flex-col rounded-lg border shadow-2xl ${colorStyles[draft.color].surface}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 sm:px-7">
        <input
          autoFocus={!focusEditor}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Title"
          maxLength={200}
          aria-label="Title"
          className="mb-2 w-full bg-transparent text-[22px] leading-tight font-medium outline-none placeholder:text-[#80868b]"
        />
        <RichTextEditor
          content={draft.content}
          onChange={(content) => setDraft((d) => ({ ...d, content }))}
          placeholder="Take a note… type '/' for blocks"
          minHeight="12rem"
          autofocus={focusEditor ? 'start' : false}
          toolbar
        />
        {selectedLabels.length > 0 && (
          <div className="mt-2">
            <LabelChips
              labels={selectedLabels}
              onRemove={(l) => setDraft((d) => ({ ...d, label_ids: d.label_ids.filter((id) => id !== l.id) }))}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between px-3 py-2 sm:px-5">
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <IconButton label="Change colour" active={menu === 'color'} onClick={() => setMenu(menu === 'color' ? null : 'color')}>
              <PaletteIcon />
            </IconButton>
            <Popover open={menu === 'color'} onClose={() => setMenu(null)}>
              <ColorPicker
                value={draft.color}
                onChange={(color) => {
                  setDraft((d) => ({ ...d, color }))
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
              <LabelPicker selectedIds={draft.label_ids} onChange={(label_ids) => setDraft((d) => ({ ...d, label_ids }))} />
            </Popover>
          </div>
          <IconButton
            label={draft.pinned ? 'Unpin' : 'Pin'}
            active={draft.pinned}
            onClick={() => setDraft((d) => ({ ...d, pinned: !d.pinned }))}
          >
            <PinIcon filled={draft.pinned} />
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="rounded px-3 py-1.5 text-sm font-medium text-[#3c4043] hover:bg-black/6 dark:text-[#e8eaed] dark:hover:bg-white/10"
          >
            Discard
          </button>
          <SaveButton state={hasContent ? 'dirty' : 'empty'} onClick={close} />
        </div>
      </div>
    </div>
    </div>
  )
}
