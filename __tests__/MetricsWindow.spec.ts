import {
  defaultLookBackDays,
  inWindow,
  metricWindowDays,
  metricsWindow
} from '../src/MetricsWindow'

const ONE_DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2024-03-01T12:00:00Z')

describe('metricsWindow', () => {
  it('spans the 30 days ending at now', () => {
    const w = metricsWindow(NOW)

    expect(metricWindowDays()).toBe(30)
    expect(w.now).toBe(+NOW)
    expect(w.to).toBe(+NOW)
    expect(w.from).toBe(+new Date('2024-01-31T12:00:00Z'))
    expect(w.to - w.from).toBe(30 * ONE_DAY)
  })

  it('fetches a further 30 days back by default', () => {
    const w = metricsWindow(NOW)

    expect(defaultLookBackDays()).toBe(30)
    expect(w.fetchFrom).toBe(+new Date('2024-01-01T12:00:00Z'))
    expect(w.from - w.fetchFrom).toBe(30 * ONE_DAY)
  })

  it('honours an explicit look-back', () => {
    const w = metricsWindow(NOW, 10)

    expect(w.fetchFrom).toBe(w.from - 10 * ONE_DAY)
    expect(w.from).toBe(metricsWindow(NOW).from)
  })
})

describe('inWindow', () => {
  const w = metricsWindow(NOW)

  it('is from <= at < to', () => {
    expect(inWindow(w, w.from - 1)).toBe(false)
    expect(inWindow(w, w.from)).toBe(true)
    expect(inWindow(w, w.from + 1)).toBe(true)
    expect(inWindow(w, w.to - 1)).toBe(true)
    expect(inWindow(w, w.to)).toBe(false)
    expect(inWindow(w, w.to + 1)).toBe(false)
  })
})
