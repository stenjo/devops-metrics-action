/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from '@octokit/core'
import * as core from '@actions/core'
import { Commit } from './types/Commit'
import { ICommitsAdapter } from './interfaces/ICommitsAdapter'

export class CommitsAdapter implements ICommitsAdapter {
  token: string | undefined
  octokit: Octokit

  constructor(token: string | undefined) {
    this.token = token
    this.octokit = new Octokit({
      auth: this.token
    })
  }
  async getCommitsFromUrl(url: string): Promise<Commit[] | undefined> {
    try {
      const result = await this.getCommits(this.octokit, url)

      return result
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }

  private async getCommits(
    octokit: Octokit,
    url: string
  ): Promise<Commit[] | undefined> {
    const result = await octokit.request(url, {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    return Promise.resolve(result.data)
  }
}
