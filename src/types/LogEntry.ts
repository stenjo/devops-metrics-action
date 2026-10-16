export interface ReleaseLogEntry {
  kind: 'release'
  at: string
  name: string
}

export interface PullLogEntry {
  kind: 'pull'
  at: string
  title: string
  commitAt: string
  commitMessage: string
  releaseAt: string
  release: string
  leadTimeDays: number
}

export interface BugLogEntry {
  number: number
  title: string
  createdAt: string
}

// A release interval counted as failed: the release that was deployed and
// the bugs opened before the next release (or before now, for the latest).
export interface FailedReleaseLogEntry {
  kind: 'failed-release'
  at: string
  name: string
  bugs: BugLogEntry[]
}

export interface TruncatedLogEntry {
  kind: 'truncated'
  omitted: number
}

export type LogEntry =
  ReleaseLogEntry | PullLogEntry | FailedReleaseLogEntry | TruncatedLogEntry
