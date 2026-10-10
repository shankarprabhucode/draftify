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

// ---------- Image sliders: arrows, dots, swipe, keyboard, gentle auto-advance
document.querySelectorAll<HTMLElement>('[data-slider]').forEach((root) => {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('.slide'))
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('.dot'))
  let index = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const show = (i: number) => {
    index = (i + slides.length) % slides.length
    slides.forEach((el) => (el.style.transform = `translateX(-${index * 100}%)`))
    dots.forEach((d, j) => d.setAttribute('aria-current', String(j === index)))
  }
  const start = () => {
    stop()
    timer = setInterval(() => show(index + 1), 6000)
  }
  const stop = () => {
    if (timer) clearInterval(timer)
    timer = null
  }

  root.querySelector('[data-prev]')?.addEventListener('click', () => { show(index - 1); start() })
  root.querySelector('[data-next]')?.addEventListener('click', () => { show(index + 1); start() })
  dots.forEach((d, j) => d.addEventListener('click', () => { show(j); start() }))
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show(index - 1); start() }
    if (e.key === 'ArrowRight') { show(index + 1); start() }
  })
  root.addEventListener('mouseenter', stop)
  root.addEventListener('mouseleave', start)

  // Swipe
  let startX: number | null = null
  root.addEventListener('pointerdown', (e) => { startX = e.clientX })
  root.addEventListener('pointerup', (e) => {
    if (startX === null) return
    const dx = e.clientX - startX
    startX = null
    if (Math.abs(dx) > 40) { show(dx < 0 ? index + 1 : index - 1); start() }
  })

  show(0)
  start()
})
