import { Extension, type Editor, type Range } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import { SlashMenu, type SlashMenuHandle, type SlashMenuProps } from './SlashMenu'
import { filterSlashItems, type SlashItem } from './slashItems'

type Props = SuggestionProps<SlashItem, SlashItem>

/** Positions the menu element under the caret, flipping above when near the bottom. */
function place(element: HTMLElement, clientRect: (() => DOMRect | null) | null | undefined) {
  const rect = clientRect?.()
  if (!rect) return
  const menuHeight = element.offsetHeight || 320
  const below = rect.bottom + 8
  const top = below + menuHeight > window.innerHeight ? rect.top - menuHeight - 8 : below
  element.style.position = 'fixed'
  element.style.left = `${Math.min(rect.left, window.innerWidth - element.offsetWidth - 16)}px`
  element.style.top = `${Math.max(8, top)}px`
  element.style.zIndex = '60'
}

/** Notion-style "/" menu built on TipTap's suggestion utility. */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) =>
          props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null

          return {
            onStart: (props: Props) => {
              renderer = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              })
              document.body.appendChild(renderer.element)
              place(renderer.element as HTMLElement, props.clientRect)
            },
            onUpdate: (props: Props) => {
              renderer?.updateProps({ items: props.items, command: props.command })
              if (renderer) place(renderer.element as HTMLElement, props.clientRect)
            },
            onKeyDown: ({ event }) => {
              if (event.key === 'Escape') {
                renderer?.destroy()
                renderer = null
                return true
              }
              return renderer?.ref?.onKeyDown(event) ?? false
            },
            onExit: () => {
              renderer?.element.remove()
              renderer?.destroy()
              renderer = null
            },
          }
        },
      }),
    ]
  },
})
