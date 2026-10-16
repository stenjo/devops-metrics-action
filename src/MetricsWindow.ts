// The single definition of "last month" shared by every adapter and metric.
// Built once per run in main.ts, the only place src/ reads the clock.
export interface MetricsWindow {
  // When the run started, epoch ms.
  readonly now: number
  // Inclusive start of the metric window: now - 30 days.
  readonly from: number
  // Exclusive end of the metric window: now.
  readonly to: number
  // Inclusive start of what adapters fetch. MTTR and change-failure-rate need
  // the release that preceded a bug opened early in the window, so adapters
  // look back a further `lookBackDays` before `from`.
  readonly fetchFrom: number
}

export interface MetricOptions {
  window: MetricsWindow
  bugLabel?: string
}

const ONE_DAY = 24 * 60 * 60 * 1000

// Functions rather than constants so the values are not static mutants for Stryker.
export function metricWindowDays(): number {
  return 30
}

export function defaultLookBackDays(): number {
  return 30
}

export function metricsWindow(
  now: Date,
  lookBackDays: number = defaultLookBackDays()
): MetricsWindow {
  const to = now.valueOf()
  const from = to - metricWindowDays() * ONE_DAY
  return {now: to, from, to, fetchFrom: from - lookBackDays * ONE_DAY}
}

// The one predicate every metric uses: from <= at < to.
export function inWindow(
  window: Pick<MetricsWindow, 'from' | 'to'>,
  at: number
): boolean {
  return window.from <= at && at < window.to
}
