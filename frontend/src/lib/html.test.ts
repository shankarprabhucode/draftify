import { describe, expect, it } from 'vitest'
import { isBlank, sanitize, toPlainText } from './html'

describe('html helpers', () => {
  it('extracts searchable plain text', () => {
    expect(toPlainText('<h1>Title</h1><p>Some <em>text</em></p>')).toBe('Title Some text')
  })
  it('treats whitespace-only markup as blank', () => {
    expect(isBlank('<p></p>')).toBe(true)
    expect(isBlank('<p>  </p>')).toBe(true)
    expect(isBlank('<p>x</p>')).toBe(false)
  })
  it('strips scripts and event handlers', () => {
    expect(sanitize('<p onclick="x()">hi</p><script>bad()</script>')).toBe('<p>hi</p>')
  })
})
