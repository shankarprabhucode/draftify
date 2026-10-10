import { describe, expect, it } from 'vitest'
import type { Note } from '../api/notes'
import { arrayMove, sortNotes, topPosition } from './order'

const n = (id: number, position: number, pinned = false): Note => ({
  id, position, pinned, title: String(id), content: '', color: 'default', updated_at: '', labels: [],
})

describe('order helpers', () => {
  it('sorts pinned first, then position, then newest', () => {
    const sorted = sortNotes([n(1, 0), n(2, 0), n(3, -1), n(4, 5, true), n(5, 1, true)])
    expect(sorted.map((x) => x.id)).toEqual([5, 4, 3, 2, 1])
  })
  it('computes a position above every note', () => {
    expect(topPosition([])).toBe(-1)
    expect(topPosition([n(1, 3), n(2, -4)])).toBe(-5)
  })
  it('moves items', () => {
    expect(arrayMove(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(arrayMove(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
})
