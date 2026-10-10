import { useState } from 'react'
import type { User } from '../api/auth'
import { useLogout } from '../hooks/useAuth'
import { Popover } from './Popover'
import { Tooltip } from './Tooltip'

export function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const logout = useLogout()
  const initial = user.email.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative">
      <Tooltip label={user.email}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Account"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a73e8] text-sm font-semibold text-white ring-offset-2 transition hover:ring-2 hover:ring-[#1a73e8]/40 dark:ring-offset-[#202124]"
        >
          {initial}
        </button>
      </Tooltip>
      <Popover open={open} onClose={() => setOpen(false)} align="right" className="w-64">
        <div className="px-4 pt-4 pb-3 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a73e8] text-xl font-semibold text-white">
            {initial}
          </div>
          <p className="truncate text-sm font-medium">{user.email}</p>
        </div>
        <div className="border-t border-black/10 p-2 dark:border-white/10">
          <a href="/" className="block rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            Home
          </a>
          <a href="/api/docs" className="block rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            API docs
          </a>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </Popover>
    </div>
  )
}
