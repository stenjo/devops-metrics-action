import type {RepoKey} from './RepoKey'

export interface Issue {
  repo: RepoKey
  number: number
  title: string
  createdAt: number
  closedAt: number | null
  labels: string[]
}
