/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import type {IIssuesAdapter} from './interfaces/IIssuesAdapter'
import type {Issue} from './types/Issue'
import type {GitHubClient} from './GitHubClient'

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

  async GetAllIssuesLastMonth(): Promise<Issue[] | undefined> {
    const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000) // Go two months back
    try {
      let result: Issue[] = []
      for (const repo of this.repositories) {
        result = result.concat(
          await this.client.paginate<Issue>(
            'GET /repos/{owner}/{repo}/issues?state=all&since={since}&per_page={per_page}&page={page}',
            {owner: this.owner, repo, since: since.toISOString()}
          )
        )
      }
      return result
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }
}
