import type {Commit} from './types/Commit'
import type {RepoKey} from './types/RepoKey'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubCommitPayload} from './github/payloads'
import {toCommit} from './github/mappers'

export class CommitsAdapter implements ICommitsAdapter {
  client: GitHubClient

  constructor(client: GitHubClient) {
    this.client = client
  }

  // Built from identifiers on purpose: never forward a URL taken from a
  // response body, as the token travels with whatever host it points at.
  async getCommits(repo: RepoKey, pullNumber: number): Promise<Commit[]> {
    const [owner, name] = repo.split('/')
    const payloads = await this.client.request<GitHubCommitPayload[]>(
      'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits',
      {owner, repo: name, pull_number: pullNumber}
    )
    return payloads.map(toCommit)
  }
}
