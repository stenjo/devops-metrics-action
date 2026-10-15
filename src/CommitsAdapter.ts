/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import type {Commit} from './types/Commit'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import type {GitHubClient} from './GitHubClient'
import type {GitHubCommitPayload} from './github/payloads'
import {toCommit} from './github/mappers'

export class CommitsAdapter implements ICommitsAdapter {
  client: GitHubClient

  constructor(client: GitHubClient) {
    this.client = client
  }

  async getCommitsFromUrl(url: string): Promise<Commit[] | undefined> {
    try {
      const payloads = await this.client.request<GitHubCommitPayload[]>(url)
      return payloads.map(toCommit)
    } catch (e: any) {
      core.setFailed(e.message)
    }
  }
}
