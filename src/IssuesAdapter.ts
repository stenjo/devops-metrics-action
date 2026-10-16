import type {IIssuesAdapter} from './interfaces/IIssuesAdapter'
import type {Issue} from './types/Issue'
import type {GitHubClient} from './GitHubClient'
import type {GitHubIssuePayload} from './github/payloads'
import {toIssue} from './github/mappers'
import {fetchWindowStart, isBeforeWindow} from './github/window'

export class IssuesAdapter implements IIssuesAdapter {
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

  async GetAllIssuesLastMonth(): Promise<Issue[]> {
    const windowStart = fetchWindowStart(this.today)
    let result: Issue[] = []
    for (const repo of this.repositories) {
      // /issues honours `since`; the predicate is a belt-and-braces stop.
      const payloads = await this.client.paginate<GitHubIssuePayload>(
        'GET /repos/{owner}/{repo}/issues',
        {
          owner: this.owner,
          repo,
          state: 'all',
          since: new Date(windowStart).toISOString()
        },
        {until: payload => isBeforeWindow(windowStart, payload.updated_at)}
      )
      result = result.concat(
        payloads.map(payload => toIssue(this.owner, repo, payload))
      )
    }
    return result
  }
}
