import {Octokit} from '@octokit/core'
import * as core from '@actions/core'
import type {Release} from './types/Release'
import type {IReleaseAdapter} from './interfaces/IReleaseAdapter'

export class ReleaseAdapter implements IReleaseAdapter {
  token: string | undefined
  owner: string
  repositories: string[]
  today: Date

  constructor(
    token: string | undefined,
    owner: string,
    repositories: string[]
  ) {
    this.token = token
    this.owner = owner
    this.repositories = repositories
    this.today = new Date()
  }
  async GetAllReleasesLastMonth(): Promise<Release[] | undefined> {
    const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000) // Go two months back
    try {
      const octokit = new Octokit({
        auth: this.token
      })

      let result: Release[] | undefined = []
      for (const repo of this.repositories) {
        let nextPage = await this.getReleases(octokit, repo, since, 1)
        result = result.concat(nextPage)
        for (let page = 2; page < 100 && nextPage.length === 100; page++) {
          nextPage = await this.getReleases(octokit, repo, since, page)
          result = result.concat(nextPage)
        }
      }

      return result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }

  private async getReleases(
    octokit: Octokit,
    repo: string,
    since: Date,
    page: number
  ): Promise<Release[]> {
    const result = await octokit.request(
      'GET /repos/{owner}/{repo}/releases?state=all&since={since}&per_page={per_page}&page={page}',
      {
        owner: this.owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        },
        since: since.toISOString(),
        per_page: 100,
        page
      }
    )
    return Promise.resolve(result.data) as Promise<Release[]>
  }
}
