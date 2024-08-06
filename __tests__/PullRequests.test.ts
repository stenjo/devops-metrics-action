import { PullRequest } from '../src/types/PullRequest'
import { PullRequestsAdapter } from '../src/PullRequestsAdapter'
import fs from 'fs'
import { Octokit } from '@octokit/core'

const ONE_DAY = 24 * 60 * 60 * 1000

test.skip('fetches tags', async () => {
  const prs = new PullRequestsAdapter(process.env['GH_TOKEN'], 'stenjo', [
    'dora'
  ])
  const prlist = await prs.GetAllPRsLastMonth()

  expect(prlist).toBeDefined()
  expect((prlist as PullRequest[]).length).toBeGreaterThan(-1)
  expect(
    (prlist as PullRequest[]).filter(
      p => +new Date(p.merged_at) > Date.now() - 7 * ONE_DAY
    ).length
  ).toBe(8)
})

test('PullRequestsAdapter should', async () => {
  const plrqs = new PullRequestsAdapter(process.env['GH_TOKEN'], 'stenjo', [
    'dora'
  ])
  plrqs.getPRs = jest.fn(
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
  const pr = (await plrqs.GetAllPRsLastMonth()) as PullRequest[]

  expect(pr.length).toBeGreaterThan(-1)
  expect(pr.length).toBe(2)
})
