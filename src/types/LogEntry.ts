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

export interface TruncatedLogEntry {
  kind: 'truncated'
  omitted: number
}

export type LogEntry = ReleaseLogEntry | PullLogEntry | TruncatedLogEntry
