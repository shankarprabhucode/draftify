import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Note } from '../api/notes'
import { NoteCard } from './NoteCard'

const note: Note = {
  id: 1,
  title: 'Grocery list',
  content: '<p>Eggs, <strong>milk</strong></p>',
  color: 'yellow',
  pinned: false,
  position: 0,
  updated_at: new Date().toISOString(),
}

const handlers = () => ({ onOpen: vi.fn(), onTogglePin: vi.fn(), onDelete: vi.fn() })

describe('NoteCard', () => {
  it('renders the title and rich content', () => {
    render(<NoteCard note={note} {...handlers()} />)
    expect(screen.getByRole('heading', { name: 'Grocery list' })).toBeInTheDocument()
    expect(screen.getByText('milk').tagName).toBe('STRONG')
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('sanitises content from the server', () => {
    const hostile = { ...note, content: '<p>safe</p><img src=x onerror="alert(1)"><script>alert(1)</script>' }
    const { container } = render(<NoteCard note={hostile} {...handlers()} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull()
    expect(screen.getByText('safe')).toBeInTheDocument()
  })

  it('opens, pins and deletes through its callbacks', async () => {
    const user = userEvent.setup()
    const h = handlers()
    render(<NoteCard note={note} {...h} />)

    await user.click(screen.getByRole('button', { name: /open note/i }))
    expect(h.onOpen).toHaveBeenCalledWith(note)

    await user.click(screen.getByRole('button', { name: 'Pin note' }))
    expect(h.onTogglePin).toHaveBeenCalledWith(note)

    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(h.onDelete).toHaveBeenCalledWith(note)
  })

  it('shows a placeholder for an empty untitled note and disables actions while creating', () => {
    render(<NoteCard note={{ ...note, id: -1, title: '', content: '' }} {...handlers()} />)
    expect(screen.getByText('Empty note')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete note' })).toBeDisabled()
  })
})
