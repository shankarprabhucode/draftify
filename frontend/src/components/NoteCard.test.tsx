import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NoteCard } from './NoteCard'

const note = { id: 1, title: 'Grocery list', content: 'Eggs, milk' }

describe('NoteCard', () => {
  it('renders the title and content', () => {
    render(<NoteCard note={note} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Grocery list' })).toBeInTheDocument()
    expect(screen.getByText('Eggs, milk')).toBeInTheDocument()
  })

  it('calls onEdit and onDelete with the note', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<NoteCard note={note} onEdit={onEdit} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(note)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(note)
  })

  it('disables actions while a delete is in flight', () => {
    render(<NoteCard note={note} onEdit={vi.fn()} onDelete={vi.fn()} deleting />)
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
  })

  it('shows a placeholder for empty content', () => {
    render(<NoteCard note={{ ...note, content: '' }} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('No content')).toBeInTheDocument()
  })
})
