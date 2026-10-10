import { forwardRef, useImperativeHandle, useState } from 'react'
import type { SlashItem } from './slashItems'

export interface SlashMenuProps {
  items: SlashItem[]
  command: (item: SlashItem) => void
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

/** The popup list shown after typing "/". Keyboard handling is driven by the suggestion plugin. */
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [index, setIndex] = useState(0)

  // Reset the highlight when the item list changes (adjusting state during render).
  const [prevItems, setPrevItems] = useState(items)
  if (prevItems !== items) {
    setPrevItems(items)
    setIndex(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === 'ArrowUp') {
        setIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        if (items[index]) command(items[index])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="slash-menu">
        <p className="px-3 py-2 text-sm text-slate-500">No matching blocks</p>
      </div>
    )
  }

  return (
    <div className="slash-menu" role="listbox" aria-label="Insert block">
      {items.map((item, i) => (
        <button
          type="button"
          key={item.title}
          role="option"
          aria-selected={i === index}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
            i === index ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white font-mono text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {item.icon}
          </span>
          <span>
            <span className="block font-medium">{item.title}</span>
            <span className="block text-xs text-slate-500">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
})
