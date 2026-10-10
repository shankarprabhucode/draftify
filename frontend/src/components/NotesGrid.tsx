import { useMemo, useState } from 'react'
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
import { NoteCard } from './NoteCard'

export interface MoveRequest {
  ids: number[]
  pin?: { note: Note; pinned: boolean }
}

interface NotesGridProps {
  /** Notes already in display order. */
  notes: Note[]
  /** Disable dragging (e.g. while a search filter hides some notes). */
  dragDisabled?: boolean
  onMove: (move: MoveRequest) => void
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

type CardHandlers = Pick<NotesGridProps, 'onOpen' | 'onTogglePin' | 'onDelete'>

function SortableNoteCard({ note, disabled, ...handlers }: { note: Note; disabled: boolean } & CardHandlers) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: disabled || note.id < 0,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="group"
      aria-roledescription="draggable note"
      className={`rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <NoteCard note={note} {...handlers} />
    </div>
  )
}

/**
 * Grid of notes with drag-and-drop ordering. A plain click still opens a note;
 * moving the pointer a few pixels (or pressing and holding on touch) starts a drag.
 * Keyboard: focus a card, Space to pick up, arrows to move, Space to drop.
 */
export function NotesGrid({ notes, dragDisabled = false, onMove, ...handlers }: NotesGridProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const ids = useMemo(() => notes.map((n) => n.id), [notes])
  const activeNote = activeId === null ? null : notes.find((n) => n.id === activeId) ?? null

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
        <div className="notes-grid" aria-label="Notes">
          {notes.map((note) => (
            <SortableNoteCard key={note.id} note={note} disabled={dragDisabled} {...handlers} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeNote && (
          <div className="rotate-1 scale-[1.03] cursor-grabbing">
            <NoteCard note={activeNote} onOpen={() => {}} onTogglePin={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
