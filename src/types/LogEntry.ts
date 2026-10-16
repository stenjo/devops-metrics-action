import type {RepoKey} from './RepoKey'

// Every record names its repository (`owner/repo`) so multi-repo runs stay attributable.
export interface ReleaseLogEntry {
  kind: 'release'
  repo: RepoKey
  at: string
  name: string
}

export interface PullLogEntry {
  kind: 'pull'
  repo: RepoKey
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
  repo: RepoKey
  at: string
  name: string
  bugs: BugLogEntry[]
}

// A bug that contributes to the mean time to restore: the last release before
// it was opened and the first release after it was closed bound the restore time.
export interface RestoreLogEntry {
  kind: 'restore'
  repo: RepoKey
  number: number
  title: string
  createdAt: string
  closedAt: string
  releaseBefore: string
  releaseBeforeAt: string
  releaseAfter: string
  releaseAfterAt: string
  restoreDays: number
}

export interface TruncatedLogEntry {
  kind: 'truncated'
  omitted: number
}

export type LogEntry =
  | ReleaseLogEntry
  | PullLogEntry
  | FailedReleaseLogEntry
  | RestoreLogEntry
  | TruncatedLogEntry
