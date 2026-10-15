import type {PullRequest} from '../src/types/PullRequest'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import fs from 'node:fs'

test('PullRequestsAdapter should', async () => {
  const client = new GitHubClient()
  const pullRequests = new PullRequestsAdapter(client, 'stenjo', ['dora'])
  vi.spyOn(client, 'request').mockImplementation(
    async (_route, params): Promise<PullRequest[]> => {
      const page = params?.page as number
      const pulls = JSON.parse(
        fs.readFileSync('./__tests__/test-data/pulls.json').toString()
      ) as PullRequest[]

      return pulls.slice((page - 1) * 100, (page - 1) * 100 + 100)
    }
  )
  const pr = (await pullRequests.GetAllPRsLastMonth()) as PullRequest[]

  expect(pr.length).toBeGreaterThan(-1)
  expect(pr.length).toBe(2)
})
