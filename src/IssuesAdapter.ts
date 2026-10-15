import type {IIssuesAdapter} from './interfaces/IIssuesAdapter'
import type {Issue} from './types/Issue'
import type {GitHubClient} from './GitHubClient'
import type {GitHubIssuePayload} from './github/payloads'
import {toIssue} from './github/mappers'

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
    const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000) // Go two months back
    let result: Issue[] = []
    for (const repo of this.repositories) {
      const payloads = await this.client.paginate<GitHubIssuePayload>(
        'GET /repos/{owner}/{repo}/issues?state=all&since={since}&per_page={per_page}&page={page}',
        {owner: this.owner, repo, since: since.toISOString()}
      )
      result = result.concat(
        payloads.map(payload => toIssue(this.owner, repo, payload))
      )
    }
    return result
  }
}
