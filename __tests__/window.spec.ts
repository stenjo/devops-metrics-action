import {fetchWindowStart, isBeforeWindow} from '../src/github/window'

describe('fetchWindowStart', () => {
  it('is exactly 61 days before today', () => {
    expect(fetchWindowStart(new Date('2024-03-01T12:00:00Z'))).toBe(
      +new Date('2023-12-31T12:00:00Z')
    )
  })
})

describe('isBeforeWindow', () => {
  const windowStart = +new Date('2023-12-31T12:00:00Z')

  it('is true only for timestamps strictly before the window start', () => {
    expect(isBeforeWindow(windowStart, '2023-12-31T11:59:59Z')).toBe(true)
    expect(isBeforeWindow(windowStart, '2023-12-31T12:00:00Z')).toBe(false)
    expect(isBeforeWindow(windowStart, '2024-01-01T00:00:00Z')).toBe(false)
  })

  it('never stops on a missing timestamp', () => {
    expect(isBeforeWindow(windowStart, null)).toBe(false)
  })
})
