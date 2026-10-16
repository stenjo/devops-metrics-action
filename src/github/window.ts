// Adapters fetch two months of history although every metric reports on the
// last month only: MTTR and change-failure-rate need the release that preceded
// a bug opened up to a month ago, so the fetch window must reach further back
// than the metric window. Centralising this into a MetricsWindow is #460.
export function fetchWindowStart(today: Date): number {
  return today.valueOf() - 61 * 24 * 60 * 60 * 1000
}

// `until` predicate helper for GitHubClient.paginate: true once an item's
// timestamp precedes the fetch window. A missing timestamp never stops paging.
export function isBeforeWindow(
  windowStart: number,
  value: string | null
): boolean {
  return value !== null && +new Date(value) < windowStart
}
