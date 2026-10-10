import { useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { promptForLink, selectActiveState } from './editorActions'
import { Divider, ToolButton } from './ToolButton'

/** Formatting toolbar that floats over the current text selection. */
export function BubbleToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({ editor, selector: ({ editor }) => selectActiveState(editor) })
  const c = () => editor.chain().focus()

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor, state }) =>
        editor.isEditable && !state.selection.empty && !editor.isActive('codeBlock')
      }
      className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
    >
      <ToolButton label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><strong>B</strong></ToolButton>
      <ToolButton label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><em>I</em></ToolButton>
      <ToolButton label="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><u>U</u></ToolButton>
      <ToolButton label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><s>S</s></ToolButton>
      <ToolButton label="Highlight" active={s.highlight} onClick={() => c().toggleHighlight().run()}>
        <span className="rounded bg-amber-200 px-1 text-slate-900">H</span>
      </ToolButton>
      <ToolButton label="Inline code" active={s.code} onClick={() => c().toggleCode().run()}><code>{'<>'}</code></ToolButton>
      <ToolButton label="Link" active={s.link} onClick={() => promptForLink(editor)}>🔗</ToolButton>
      <Divider />
      <ToolButton label="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>H1</ToolButton>
      <ToolButton label="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
      <ToolButton label="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>•≡</ToolButton>
      <ToolButton label="To-do list" active={s.task} onClick={() => c().toggleTaskList().run()}>☑</ToolButton>
    </BubbleMenu>
  )
}
