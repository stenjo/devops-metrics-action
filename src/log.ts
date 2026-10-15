import type {LogEntry, TruncatedLogEntry} from './types/LogEntry'

export interface LogLimits {
  maxEntries: number
  maxBytes: number
}

// GitHub caps a single step output at 1 MiB; stay well under it. A function
// rather than a constant so the arithmetic is not a static mutant for Stryker.
export function defaultLogLimits(): LogLimits {
  return {maxEntries: 500, maxBytes: 1024 * 1024 - 1024}
}

// Room reserved for the trailing truncated record and the closing bracket.
const TRUNCATED_RESERVE = 64

export function serializeLog(
  entries: readonly LogEntry[],
  limits: LogLimits = defaultLogLimits()
): string {
  const kept: string[] = []
  let bytes = 2
  let omitted = 0

  for (const [index, entry] of entries.entries()) {
    const json = JSON.stringify(entry)
    const added = Buffer.byteLength(json) + (kept.length > 0 ? 1 : 0)
    if (
      index >= limits.maxEntries ||
      bytes + added + TRUNCATED_RESERVE > limits.maxBytes
    ) {
      omitted = entries.length - index
      break
    }
    kept.push(json)
    bytes += added
  }

  if (omitted > 0) {
    const marker: TruncatedLogEntry = {kind: 'truncated', omitted}
    kept.push(JSON.stringify(marker))
  }

  return `[${kept.join(',')}]`
}
