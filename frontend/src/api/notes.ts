import { request } from './client'

export interface Note {
  id: number
  title: string
  content: string
}

export type NoteInput = Omit<Note, 'id'>

export const notesApi = {
  list: () => request<Note[]>('/notes'),
  create: (input: NoteInput) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: NoteInput) =>
    request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`/notes/${id}`, { method: 'DELETE' }),
}
