import './site.css'

// Session-aware calls to action: signed-in visitors go straight to the app.
fetch('/api/auth/me', { credentials: 'same-origin' })
  .then((r) => (r.ok ? r.json() : null))
  .then((user) => {
    if (!user) return
    document.querySelectorAll<HTMLAnchorElement>('[data-cta]').forEach((a) => {
      a.href = '/app'
      a.textContent = a.dataset.cta === 'primary' ? 'Open Draftify' : 'Open app'
    })
  })
  .catch(() => {})

// Mobile nav toggle
const toggle = document.getElementById('nav-toggle')
const menu = document.getElementById('nav-menu')
toggle?.addEventListener('click', () => {
  const open = menu?.classList.toggle('hidden') === false
  toggle.setAttribute('aria-expanded', String(open))
})
