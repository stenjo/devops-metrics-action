import {MAX_TEXT_LENGTH, sanitizeText} from '../src/sanitize'

const ELLIPSIS = '\u2026'
const INJECTION = '`id` ${{ github.token }} $(rm -rf /)'

describe('sanitizeText', () => {
  it('leaves ordinary titles untouched', () => {
    expect(sanitizeText('feat(scope): add thing #12')).toBe(
      'feat(scope): add thing #12'
    )
  })

  it('removes backticks and ${ / $( openers from an injection payload', () => {
    const out = sanitizeText(INJECTION)

    expect(out).toBe('id {{ github.token }} (rm -rf /)')
    expect(out).not.toMatch(/[`\n]|\$\{|\$\(/)
  })

  it('keeps a lone dollar sign that opens nothing', () => {
    expect(sanitizeText('costs $5 and ${')).toBe('costs $5 and {')
  })

  it('replaces control characters and newlines with a single space', () => {
    expect(sanitizeText('a\r\nb\tc\u0000d\u001be\u2028f')).toBe('a b c d e f')
  })

  it('collapses runs of whitespace and trims the ends', () => {
    expect(sanitizeText('  fix:   many    spaces \n ')).toBe('fix: many spaces')
  })

  it('maps null and undefined to an empty string', () => {
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
  })

  it('truncates to the cap with a trailing ellipsis', () => {
    const long = 'x'.repeat(MAX_TEXT_LENGTH + 50)

    const out = sanitizeText(long)

    expect(out).toHaveLength(MAX_TEXT_LENGTH)
    expect(out.endsWith(ELLIPSIS)).toBe(true)
    expect(out.slice(0, -1)).toBe('x'.repeat(MAX_TEXT_LENGTH - 1))
  })

  it('does not truncate text exactly at the cap', () => {
    const exact = 'y'.repeat(MAX_TEXT_LENGTH)

    expect(sanitizeText(exact)).toBe(exact)
  })

  it('truncates after sanitizing, so the cap applies to the cleaned text', () => {
    const padded = `${'z'.repeat(10)}${'\n'.repeat(500)}${'z'.repeat(10)}`

    expect(sanitizeText(padded)).toBe(`${'z'.repeat(10)} ${'z'.repeat(10)}`)
  })

  it('honours a custom cap', () => {
    expect(sanitizeText('abcdefgh', 5)).toBe(`abcd${ELLIPSIS}`)
  })
})
