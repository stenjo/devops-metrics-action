import type {RepoKey} from './RepoKey'

export interface PullRequest {
  repo: RepoKey
  number: number
  title: string
  mergedAt: number | null
  baseRef: string
}
