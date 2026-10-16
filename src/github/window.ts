// `until` predicate helper for GitHubClient.paginate: true once an item's
// timestamp precedes `MetricsWindow.fetchFrom`. A missing timestamp never
// stops paging.
export function isBeforeWindow(
  fetchFrom: number,
  value: string | null
): boolean {
  return value !== null && +new Date(value) < fetchFrom
}
