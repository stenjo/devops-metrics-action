import type {RepoKey} from './RepoKey'

export interface PullRequest {
  repo: RepoKey
  title: string
  mergedAt: number | null
  baseRef: string
  commitsUrl: string
}
