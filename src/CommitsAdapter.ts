import type {Commit} from './types/Commit'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubCommitPayload} from './github/payloads'
import {toCommit} from './github/mappers'

export class CommitsAdapter implements ICommitsAdapter {
  client: GitHubClient

  constructor(client: GitHubClient) {
    this.client = client
  }

  async getCommitsFromUrl(url: string): Promise<Commit[]> {
    const payloads = await this.client.request<GitHubCommitPayload[]>(url)
    return payloads.map(toCommit)
  }
}
