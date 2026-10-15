import type {RepoKey} from './RepoKey'

export interface Issue {
  repo: RepoKey
  createdAt: number
  closedAt: number | null
  labels: string[]
}
