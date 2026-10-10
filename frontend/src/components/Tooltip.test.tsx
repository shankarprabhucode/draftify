import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { IconButton } from './IconButton'

describe('Tooltip', () => {
  it('shows the label on hover after a delay and hides on leave', async () => {
    const user = userEvent.setup()
    render(<IconButton label="Archive note" onClick={() => {}}>x</IconButton>)
    const button = screen.getByRole('button', { name: 'Archive note' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    await user.hover(button)
    expect(await screen.findByRole('tooltip', {}, { timeout: 1000 })).toHaveTextContent('Archive note')
    await user.unhover(button)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
