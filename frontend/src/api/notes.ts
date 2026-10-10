import { request } from './client'

export const NOTE_COLORS = [
  'default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray',
] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Label {
  id: number
  name: string
}

export interface Note {
  id: number
  title: string
  content: string // sanitised HTML from the editor
  color: NoteColor
  pinned: boolean
  /** Manual order within the pinned/unpinned group; lower comes first. */
  position: number
  updated_at: string // ISO 8601
  labels: Label[]
}

export interface NoteInput {
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  label_ids: number[]
}

export const emptyNoteInput: NoteInput = {
  title: '',
  content: '',
  color: 'default',
  pinned: false,
  label_ids: [],
}

export const toInput = (note: Note): NoteInput => ({
  title: note.title,
  content: note.content,
  color: note.color,
  pinned: note.pinned,
  label_ids: note.labels.map((l) => l.id),
})

export const notesApi = {
  list: () => request<Note[]>('/notes'),
  create: (input: NoteInput) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: NoteInput) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
  /** Persist a full display order. Returns every note in the new order. */
  reorder: (ids: number[]) =>
    request<Note[]>('/notes/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
}

export const labelsApi = {
  list: () => request<Label[]>('/labels'),
  create: (name: string) =>
    request<Label>('/labels', { method: 'POST', body: JSON.stringify({ name }) }),
  rename: (id: number, name: string) =>
    request<Label>(`/labels/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  remove: (id: number) => request<void>(`/labels/${id}`, { method: 'DELETE' }),
}
