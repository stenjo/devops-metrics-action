import {Commit} from '../types/Commit'
import type {RepoKey} from '../types/RepoKey'

export interface ICommitsAdapter {
  getCommits(repo: RepoKey, pullNumber: number): Promise<Commit[]>
}
