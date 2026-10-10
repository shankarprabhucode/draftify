import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Note } from '../api/notes'
import { arrayMove } from '../lib/order'
import { NoteCard, type NoteCardProps } from './NoteCard'

export interface MoveRequest {
  ids: number[]
  pin?: { note: Note; pinned: boolean }
}

type CardHandlers = Omit<NoteCardProps, 'note'>

interface NotesGridProps extends CardHandlers {
  /** Notes already in display order. */
  notes: Note[]
  /** Single column (Keep's list view) instead of the masonry wall. */
  list?: boolean
  /** Disable dragging (e.g. while a search filter hides some notes). */
  dragDisabled?: boolean
  onMove: (move: MoveRequest) => void
}

// Masonry on a CSS grid: each card spans enough fixed-height rows to fit its
// content, measured with a ResizeObserver. Keeps DnD transforms predictable.
const ROW = 8
const GAP = 12

function useRowSpan() {
  const ref = useRef<HTMLDivElement>(null)
  const [span, setSpan] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSpan(Math.max(1, Math.ceil((el.offsetHeight + GAP) / (ROW + GAP))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, span }
}

function SortableNoteCard({ note, disabled, ...handlers }: { note: Note; disabled: boolean } & CardHandlers) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: disabled || note.id < 0,
  })
  const { ref, span } = useRowSpan()
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, gridRowEnd: `span ${span}` }}
      {...attributes}
      {...listeners}
      role="group"
      aria-roledescription="draggable note"
      className={`rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#a142f4] ${isDragging ? 'opacity-30' : ''}`}
    >
      <div ref={ref}>
        <NoteCard note={note} {...handlers} />
      </div>
    </div>
  )
}

function Section({ title, notes, disabled, list, ...handlers }: { title?: string; notes: Note[]; disabled: boolean; list: boolean } & CardHandlers) {
  if (notes.length === 0) return null
  return (
    <section aria-label={title ?? 'Notes'} className="mb-8">
      {title && (
        <h2 className="mb-2 pl-2 text-[11px] font-medium tracking-wide text-[#5f6368] uppercase dark:text-[#9aa0a6]">
          {title}
        </h2>
      )}
      <div className={list ? 'notes-list' : 'notes-masonry'} style={{ gridAutoRows: ROW, gap: GAP }}>
        {notes.map((note) => (
          <SortableNoteCard key={note.id} note={note} disabled={disabled} {...handlers} />
        ))}
      </div>
    </section>
  )
}

/**
 * Notes wall with drag-and-drop ordering. A plain click still opens a note;
 * moving the pointer a few pixels (or pressing and holding on touch) starts a drag.
 * Keyboard: focus a card, Space to pick up, arrows to move, Space to drop.
 */
export function NotesGrid({ notes, list = false, dragDisabled = false, onMove, ...handlers }: NotesGridProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const ids = useMemo(() => notes.map((n) => n.id), [notes])
  const activeNote = activeId === null ? null : notes.find((n) => n.id === activeId) ?? null
  const pinned = notes.filter((n) => n.pinned)
  const others = notes.filter((n) => !n.pinned)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(Number(active.id))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    const moved = notes[from]
    const target = notes[to]
    const next = arrayMove(notes, from, to)
    onMove({
      ids: next.map((n) => n.id),
      // Dropping into the other group changes the pinned state to match it.
      pin: moved.pinned !== target.pinned ? { note: moved, pinned: target.pinned } : undefined,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <Section title={pinned.length ? 'Pinned' : undefined} notes={pinned} disabled={dragDisabled} list={list} {...handlers} />
        <Section title={pinned.length ? 'Others' : undefined} notes={others} disabled={dragDisabled} list={list} {...handlers} />
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeNote && (
          <div className="rotate-1 scale-[1.03] cursor-grabbing shadow-keep">
            <NoteCard note={activeNote} onOpen={() => {}} onPatch={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
