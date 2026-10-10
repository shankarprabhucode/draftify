import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { BubbleToolbar } from './BubbleToolbar'
import { EditorToolbar } from './EditorToolbar'
import { SlashCommand } from './SlashCommand'

interface RichTextEditorProps {
  /** Initial HTML. Later changes are applied only if they differ from the editor's own output. */
  content: string
  onChange: (html: string) => void
  placeholder?: string
  autofocus?: boolean
  /** Compact mode for the quick-capture box. */
  minHeight?: string
  /** Show the persistent formatting toolbar above the content. */
  toolbar?: boolean
  /** Read-only rendering (e.g. a note in the trash). */
  editable?: boolean
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Take a note… type '/' for blocks",
  autofocus = false,
  minHeight = '8rem',
  toolbar = false,
  editable = true,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      SlashCommand,
    ],
    content,
    editable,
    autofocus: autofocus && editable ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rich-text outline-none',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  // Keep the editor in sync if the content prop changes from the outside
  // (e.g. a different note opened in the same dialog instance).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (content !== current) editor.commands.setContent(content, { emitUpdate: false })
  }, [editor, content])

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable)
  }, [editor, editable])

  if (!editor) return null

  return (
    <div className={className}>
      {toolbar && editable && (
        <div className="mb-3">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
