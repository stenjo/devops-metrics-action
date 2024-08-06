import { Commit } from '../types/Commit'

export interface ICommitsAdapter {
  getCommitsFromUrl(url: string): Promise<Commit[] | undefined>
}
