import DOMPurify from 'dompurify'

/** Note content comes from the server, so it is sanitised before being rendered as HTML. */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

/** Plain text of an HTML fragment, for search and "is this note empty" checks. */
export function toPlainText(html: string): string {
  if (!html) return ''
  // Separate block-level elements with spaces so "<h1>A</h1><p>B</p>" reads "A B".
  const spaced = html.replace(/<\/?(p|h[1-6]|li|div|blockquote|pre|tr|td|th|br)\b[^>]*>/gi, ' ')
  const doc = new DOMParser().parseFromString(spaced, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function isBlank(html: string): boolean {
  return toPlainText(html).length === 0
}
