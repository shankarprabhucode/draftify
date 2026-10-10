import { useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'

interface ToolButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolButton({ label, active, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-sm font-medium transition ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

/** Formatting toolbar that floats over the current text selection. */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      highlight: editor.isActive('highlight'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      bullet: editor.isActive('bulletList'),
      task: editor.isActive('taskList'),
    }),
  })

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url.trim() === '') editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor, state }) =>
        editor.isEditable && !state.selection.empty && !editor.isActive('codeBlock')
      }
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
    >
      <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolButton>
      <ToolButton label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </ToolButton>
      <ToolButton label="Highlight" active={state.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <span className="rounded bg-amber-200 px-1 text-slate-900">H</span>
      </ToolButton>
      <ToolButton label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <code>{'<>'}</code>
      </ToolButton>
      <ToolButton label="Link" active={state.link} onClick={setLink}>
        🔗
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
      <ToolButton label="Heading 1" active={state.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </ToolButton>
      <ToolButton label="Heading 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolButton>
      <ToolButton label="Bullet list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •≡
      </ToolButton>
      <ToolButton label="To-do list" active={state.task} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        ☑
      </ToolButton>
    </BubbleMenu>
  )
}
