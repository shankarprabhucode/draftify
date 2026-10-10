import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor', () => {
  it('renders existing HTML content as editable rich text', async () => {
    render(<RichTextEditor content="<h2>Plan</h2><ul><li>one</li></ul>" onChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument())
    expect(screen.getByText('one').closest('ul')).not.toBeNull()
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull()
  })

  it('shows the placeholder when empty', async () => {
    render(<RichTextEditor content="" onChange={vi.fn()} placeholder="Jot it down" />)
    await waitFor(() =>
      expect(document.querySelector('p.is-editor-empty')?.getAttribute('data-placeholder')).toBe('Jot it down'),
    )
  })
})
