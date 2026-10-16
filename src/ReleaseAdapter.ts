import type {Release} from './types/Release'
import type {IReleaseAdapter} from './interfaces/IReleaseAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubReleasePayload} from './github/payloads'
import {toRelease} from './github/mappers'
import {fetchWindowStart, isBeforeWindow} from './github/window'

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
    const windowStart = fetchWindowStart(this.today)
    let result: Release[] = []
    for (const repo of this.repositories) {
      // Releases are returned newest first; drafts have no published_at.
      const payloads = await this.client.paginate<GitHubReleasePayload>(
        'GET /repos/{owner}/{repo}/releases',
        {owner: this.owner, repo},
        {
          until: payload =>
            isBeforeWindow(
              windowStart,
              payload.published_at ?? payload.created_at
            )
        }
      )
      result = result.concat(
        payloads.map(payload => toRelease(this.owner, repo, payload))
      )
    }
    return result
  }
}
