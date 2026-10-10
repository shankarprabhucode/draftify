import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { Note } from '../api/notes'
import { NoteCard } from './NoteCard'

const note: Note = {
  id: 1,
  title: 'Grocery list',
  content: '<p>Eggs, <strong>milk</strong></p>',
  color: 'yellow',
  pinned: false,
  archived: false,
  position: 0,
  updated_at: new Date().toISOString(),
  deleted_at: null,
  labels: [{ id: 7, name: 'Home' }],
}

const handlers = () => ({
  onOpen: vi.fn(), onPatch: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn(), onRestore: vi.fn(), onLabelClick: vi.fn(),
})

const renderCard = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('NoteCard', () => {
  it('renders the title, rich content and labels', () => {
    renderCard(<NoteCard note={note} {...handlers()} />)
    expect(screen.getByRole('heading', { name: 'Grocery list' })).toBeInTheDocument()
    expect(screen.getByText('milk').tagName).toBe('STRONG')
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })

  it('sanitises content from the server', () => {
    const hostile = { ...note, content: '<p>safe</p><img src=x onerror="alert(1)"><script>alert(1)</script>' }
    const { container } = renderCard(<NoteCard note={hostile} {...handlers()} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull()
    expect(screen.getByText('safe')).toBeInTheDocument()
  })

  it('opens, pins, labels and deletes through its callbacks', async () => {
    const user = userEvent.setup()
    const h = handlers()
    renderCard(<NoteCard note={note} {...h} />)

    await user.click(screen.getByRole('button', { name: /open note/i }))
    expect(h.onOpen).toHaveBeenCalledWith(note)

    await user.click(screen.getByRole('button', { name: 'Pin note' }))
    expect(h.onPatch).toHaveBeenCalledWith(note, { pinned: true })

    await user.click(screen.getByRole('button', { name: 'Home' }))
    expect(h.onLabelClick).toHaveBeenCalledWith(note.labels[0])

    await user.click(screen.getByRole('button', { name: 'Archive note' }))
    expect(h.onArchive).toHaveBeenCalledWith(note, true)

    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(h.onDelete).toHaveBeenCalledWith(note)
  })

  it('offers restore and delete-forever for a trashed note, and no pin', async () => {
    const user = userEvent.setup()
    const h = handlers()
    renderCard(<NoteCard note={{ ...note, deleted_at: new Date().toISOString() }} {...h} />)
    expect(screen.queryByRole('button', { name: /pin note/i })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Restore note' }))
    expect(h.onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    await user.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(h.onDelete).toHaveBeenCalled()
  })

  it('shows a placeholder for an empty untitled note and a saving state while creating', () => {
    renderCard(<NoteCard note={{ ...note, id: -1, title: '', content: '', labels: [] }} {...handlers()} />)
    expect(screen.getByText('Empty note')).toBeInTheDocument()
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete note' })).toBeNull()
  })
})
