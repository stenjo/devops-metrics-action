import type {IIssuesAdapter} from './interfaces/IIssuesAdapter'
import type {Issue} from './types/Issue'
import type {GitHubClient} from './GitHubClient'
import type {GitHubIssuePayload} from './github/payloads'
import {toIssue} from './github/mappers'
import {isBeforeWindow} from './github/window'
import type {MetricsWindow} from './MetricsWindow'

export class IssuesAdapter implements IIssuesAdapter {
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

  async GetAllIssuesLastMonth(): Promise<Issue[]> {
    const {fetchFrom} = this.window
    let result: Issue[] = []
    for (const repo of this.repositories) {
      // /issues honours `since`; the predicate is a belt-and-braces stop.
      const payloads = await this.client.paginate<GitHubIssuePayload>(
        'GET /repos/{owner}/{repo}/issues',
        {
          owner: this.owner,
          repo,
          state: 'all',
          since: new Date(fetchFrom).toISOString()
        },
        {until: payload => isBeforeWindow(fetchFrom, payload.updated_at)}
      )
      result = result.concat(
        payloads.map(payload => toIssue(this.owner, repo, payload))
      )
    }
    return result
  }
}
