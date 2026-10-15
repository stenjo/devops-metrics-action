// Epoch milliseconds rendered the way GitHub does: second precision, Z suffix.
export function isoTimestamp(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 19)}Z`
}
