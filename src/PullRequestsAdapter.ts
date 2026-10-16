import type {IPullRequestsAdapter} from './interfaces/IPullRequestsAdapter'
import type {PullRequest} from './types/PullRequest'
import type {GitHubClient} from './GitHubClient'
import type {GitHubPullRequestPayload} from './github/payloads'
import {toPullRequest} from './github/mappers'
import {isBeforeWindow} from './github/window'
import type {MetricsWindow} from './MetricsWindow'

export class PullRequestsAdapter implements IPullRequestsAdapter {
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

  async GetAllPRsLastMonth(): Promise<PullRequest[]> {
    const {fetchFrom} = this.window
    let result: PullRequest[] = []
    for (const repo of this.repositories) {
      // merged_at <= updated_at, so newest-updated-first is a safe superset.
      const payloads = await this.client.paginate<GitHubPullRequestPayload>(
        'GET /repos/{owner}/{repo}/pulls',
        {
          owner: this.owner,
          repo,
          state: 'closed',
          sort: 'updated',
          direction: 'desc'
        },
        {until: payload => isBeforeWindow(fetchFrom, payload.updated_at)}
      )
      result = result.concat(
        payloads.map(payload => toPullRequest(this.owner, repo, payload))
      )
    }
    return result
  }
}
