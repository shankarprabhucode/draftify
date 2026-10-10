import { request } from './client'

export const NOTE_COLORS = [
  'default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray',
] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: number
  title: string
  content: string // sanitised HTML from the editor
  color: NoteColor
  pinned: boolean
  updated_at: string // ISO 8601
}

export type NoteInput = Pick<Note, 'title' | 'content' | 'color' | 'pinned'>

export const emptyNoteInput: NoteInput = { title: '', content: '', color: 'default', pinned: false }

export const toInput = (note: Note): NoteInput => ({
  title: note.title,
  content: note.content,
  color: note.color,
  pinned: note.pinned,
})

export const notesApi = {
  list: () => request<Note[]>('/notes'),
  create: (input: NoteInput) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: NoteInput) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
}
