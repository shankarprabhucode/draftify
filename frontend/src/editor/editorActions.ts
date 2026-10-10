import type { Editor } from '@tiptap/core'

/** Shared "is this mark/node active" snapshot for toolbars. */
export const selectActiveState = (editor: Editor) => ({
  bold: editor.isActive('bold'),
  italic: editor.isActive('italic'),
  underline: editor.isActive('underline'),
  strike: editor.isActive('strike'),
  highlight: editor.isActive('highlight'),
  code: editor.isActive('code'),
  link: editor.isActive('link'),
  h1: editor.isActive('heading', { level: 1 }),
  h2: editor.isActive('heading', { level: 2 }),
  h3: editor.isActive('heading', { level: 3 }),
  bullet: editor.isActive('bulletList'),
  ordered: editor.isActive('orderedList'),
  task: editor.isActive('taskList'),
  quote: editor.isActive('blockquote'),
  codeBlock: editor.isActive('codeBlock'),
  canUndo: editor.can().undo(),
  canRedo: editor.can().redo(),
})

export type ActiveState = ReturnType<typeof selectActiveState>

export function promptForLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined
  const url = window.prompt('Link URL', previous ?? 'https://')
  if (url === null) return
  if (url.trim() === '') editor.chain().focus().unsetLink().run()
  else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
}
