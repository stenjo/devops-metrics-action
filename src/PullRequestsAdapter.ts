/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import type {IPullRequestsAdapter} from './interfaces/IPullRequestsAdapter'
import type {PullRequest} from './types/PullRequest'
import type {GitHubClient} from './GitHubClient'
import type {GitHubPullRequestPayload} from './github/payloads'
import {toPullRequest} from './github/mappers'

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

  async GetAllPRsLastMonth(): Promise<PullRequest[] | undefined> {
    const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000) // Go two months back
    try {
      let result: PullRequest[] = []
      for (const repo of this.repositories) {
        const payloads = await this.client.paginate<GitHubPullRequestPayload>(
          'GET /repos/{owner}/{repo}/pulls?state=closed&since={since}&per_page={per_page}&page={page}',
          {owner: this.owner, repo, since: since.toISOString()}
        )
        result = result.concat(
          payloads.map(payload => toPullRequest(this.owner, repo, payload))
        )
      }
      return result
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }
}
