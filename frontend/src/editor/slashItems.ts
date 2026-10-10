import type { Editor, Range } from '@tiptap/core'

export interface SlashItem {
  title: string
  description: string
  keywords: string[]
  /** Short glyph shown in the menu. */
  icon: string
  run: (editor: Editor, range: Range) => void
}

const chain = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range)

export const slashItems: SlashItem[] = [
  { title: 'Text', description: 'Plain paragraph', keywords: ['paragraph', 'p'], icon: 'T',
    run: (e, r) => chain(e, r).setParagraph().run() },
  { title: 'Heading 1', description: 'Large section heading', keywords: ['h1', 'title'], icon: 'H1',
    run: (e, r) => chain(e, r).setHeading({ level: 1 }).run() },
  { title: 'Heading 2', description: 'Medium section heading', keywords: ['h2'], icon: 'H2',
    run: (e, r) => chain(e, r).setHeading({ level: 2 }).run() },
  { title: 'Heading 3', description: 'Small section heading', keywords: ['h3'], icon: 'H3',
    run: (e, r) => chain(e, r).setHeading({ level: 3 }).run() },
  { title: 'Bullet list', description: 'Simple bulleted list', keywords: ['ul', 'list'], icon: '•',
    run: (e, r) => chain(e, r).toggleBulletList().run() },
  { title: 'Numbered list', description: 'List with numbers', keywords: ['ol', 'ordered'], icon: '1.',
    run: (e, r) => chain(e, r).toggleOrderedList().run() },
  { title: 'To-do list', description: 'Checklist with checkboxes', keywords: ['todo', 'task', 'check'], icon: '☑',
    run: (e, r) => chain(e, r).toggleTaskList().run() },
  { title: 'Quote', description: 'Call out a quotation', keywords: ['blockquote'], icon: '“',
    run: (e, r) => chain(e, r).toggleBlockquote().run() },
  { title: 'Code block', description: 'Monospaced code', keywords: ['code', 'pre'], icon: '</>',
    run: (e, r) => chain(e, r).toggleCodeBlock().run() },
  { title: 'Divider', description: 'Horizontal rule', keywords: ['hr', 'rule', 'line'], icon: '—',
    run: (e, r) => chain(e, r).setHorizontalRule().run() },
]

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return slashItems
  return slashItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
  )
}
