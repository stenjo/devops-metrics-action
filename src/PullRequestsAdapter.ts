import type {IPullRequestsAdapter} from './interfaces/IPullRequestsAdapter'
import type {PullRequest} from './types/PullRequest'
import type {GitHubClient} from './GitHubClient'
import type {GitHubPullRequestPayload} from './github/payloads'
import {toPullRequest} from './github/mappers'
import {fetchWindowStart, isBeforeWindow} from './github/window'

export class PullRequestsAdapter implements IPullRequestsAdapter {
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

  async GetAllPRsLastMonth(): Promise<PullRequest[]> {
    const windowStart = fetchWindowStart(this.today)
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
        {until: payload => isBeforeWindow(windowStart, payload.updated_at)}
      )
      result = result.concat(
        payloads.map(payload => toPullRequest(this.owner, repo, payload))
      )
    }
    return result
  }
}
