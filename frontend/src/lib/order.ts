import type { Note } from '../api/notes'

/** Display order: pinned first, then manual position, newest first among equals. */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position || b.id - a.id,
  )
}

/** Position that sorts before every existing note. */
export function topPosition(notes: readonly Note[]): number {
  return Math.min(0, ...notes.map((n) => n.position)) - 1
}

/** Move an item within an array (returns a copy). */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
