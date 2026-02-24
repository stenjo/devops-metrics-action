import type {PullRequest} from '../src/types/PullRequest'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import fs from 'node:fs'
import type {Octokit} from '@octokit/core'

test('PullRequestsAdapter should', async () => {
  const pullRequests = new PullRequestsAdapter(process.env.GH_TOKEN, 'stenjo', [
    'dora'
  ])
  pullRequests.getPRs = vi.fn(
    async (
      octokit: Octokit,
      repo: string,
      since: Date,
      page: number
    ): Promise<PullRequest[]> => {
      const pulls = JSON.parse(
        fs.readFileSync('./__tests__/test-data/pulls.json').toString()
      ) as PullRequest[]

      return Promise.resolve(
        pulls.slice((page - 1) * 100, (page - 1) * 100 + 100)
      )
    }
  )
  const pr = (await pullRequests.GetAllPRsLastMonth()) as PullRequest[]

  expect(pr.length).toBeGreaterThan(-1)
  expect(pr.length).toBe(2)
})
