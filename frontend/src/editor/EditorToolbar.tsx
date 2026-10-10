import { useEditorState, type Editor } from '@tiptap/react'
import { promptForLink, selectActiveState } from './editorActions'
import { Divider, ToolButton } from './ToolButton'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/** Always-visible toolbar for the dialog editor. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({ editor, selector: ({ editor }) => selectActiveState(editor) })
  const c = () => editor.chain().focus()

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200/80 bg-white/70 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900/60"
    >
      <ToolButton label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Icon d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
      </ToolButton>
      <Divider />
      <ToolButton label="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>H1</ToolButton>
      <ToolButton label="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
      <ToolButton label="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</ToolButton>
      <Divider />
      <ToolButton label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><strong>B</strong></ToolButton>
      <ToolButton label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><em className="font-serif">I</em></ToolButton>
      <ToolButton label="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><u>U</u></ToolButton>
      <ToolButton label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><s>S</s></ToolButton>
      <ToolButton label="Highlight" active={s.highlight} onClick={() => c().toggleHighlight().run()}>
        <span className="rounded bg-amber-200 px-1 leading-5 text-slate-900">H</span>
      </ToolButton>
      <ToolButton label="Inline code" active={s.code} onClick={() => c().toggleCode().run()}>
        <Icon d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
      </ToolButton>
      <ToolButton label="Link" active={s.link} onClick={() => promptForLink(editor)}>
        <Icon d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </ToolButton>
      <Divider />
      <ToolButton label="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3a1 1 0 0 0-2 0" />
      </ToolButton>
      <ToolButton label="To-do list" active={s.task} onClick={() => c().toggleTaskList().run()}>
        <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </ToolButton>
      <ToolButton label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Icon d="M6 17h3l2-4V7H5v6h3zM14 17h3l2-4V7h-6v6h3z" />
      </ToolButton>
      <ToolButton label="Code block" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()}>
        <Icon d="M4 4h16v16H4zM9 9l-2 3 2 3M15 9l2 3-2 3" />
      </ToolButton>
      <ToolButton label="Divider" onClick={() => c().setHorizontalRule().run()}>
        <Icon d="M4 12h16" />
      </ToolButton>
    </div>
  )
}
