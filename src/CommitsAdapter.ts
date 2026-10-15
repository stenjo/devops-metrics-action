/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import type {Commit} from './types/Commit'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import type {GitHubClient} from './GitHubClient'

export class CommitsAdapter implements ICommitsAdapter {
  client: GitHubClient

  constructor(client: GitHubClient) {
    this.client = client
  }

  async getCommitsFromUrl(url: string): Promise<Commit[] | undefined> {
    try {
      return await this.client.request<Commit[]>(url)
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }
}
