import type {Release} from './types/Release'
import type {IReleaseAdapter} from './interfaces/IReleaseAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubReleasePayload} from './github/payloads'
import {toRelease} from './github/mappers'
import {isBeforeWindow} from './github/window'
import type {MetricsWindow} from './MetricsWindow'

export class ReleaseAdapter implements IReleaseAdapter {
  client: GitHubClient
  owner: string
  repositories: string[]
  private readonly window: Pick<MetricsWindow, 'fetchFrom'>

  constructor(
    client: GitHubClient,
    owner: string,
    repositories: string[],
    window: Pick<MetricsWindow, 'fetchFrom'>
  ) {
    this.client = client
    this.owner = owner
    this.repositories = repositories
    this.window = window
  }

  async GetAllReleasesLastMonth(): Promise<Release[]> {
    const {fetchFrom} = this.window
    let result: Release[] = []
    for (const repo of this.repositories) {
      // Releases are returned newest first; drafts have no published_at.
      const payloads = await this.client.paginate<GitHubReleasePayload>(
        'GET /repos/{owner}/{repo}/releases',
        {owner: this.owner, repo},
        {
          until: payload =>
            isBeforeWindow(
              fetchFrom,
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
