import type {Release} from './types/Release'
import type {IReleaseAdapter} from './interfaces/IReleaseAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubReleasePayload} from './github/payloads'
import {toRelease} from './github/mappers'

export class ReleaseAdapter implements IReleaseAdapter {
  client: GitHubClient
  owner: string
  repositories: string[]
  today: Date

  constructor(client: GitHubClient, owner: string, repositories: string[]) {
    this.client = client
    this.owner = owner
    this.repositories = repositories
    this.today = new Date()
  }

  async GetAllReleasesLastMonth(): Promise<Release[]> {
    const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000) // Go two months back
    let result: Release[] = []
    for (const repo of this.repositories) {
      const payloads = await this.client.paginate<GitHubReleasePayload>(
        'GET /repos/{owner}/{repo}/releases?state=all&since={since}&per_page={per_page}&page={page}',
        {owner: this.owner, repo, since: since.toISOString()}
      )
      result = result.concat(
        payloads.map(payload => toRelease(this.owner, repo, payload))
      )
    }
    return result
  }
}
