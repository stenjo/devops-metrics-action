import type {RepoKey} from './RepoKey'

export interface Release {
  repo: RepoKey
  name: string
  publishedAt: number
}
