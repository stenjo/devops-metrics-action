import type {GitHubPullRequestPayload} from '../src/github/payloads'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import fs from 'node:fs'
import {windowAt} from './helpers/domain'

test('PullRequestsAdapter should', async () => {
  const client = new GitHubClient()
  const pullRequests = new PullRequestsAdapter(
    client,
    'stenjo',
    ['dora'],
    windowAt('2023-05-20T00:00:00Z')
  )
  vi.spyOn(client, 'request').mockImplementation(
    async (_route, params): Promise<GitHubPullRequestPayload[]> => {
      const page = params?.page as number
      const pulls = JSON.parse(
        fs.readFileSync('./__tests__/test-data/pulls.json').toString()
      ) as GitHubPullRequestPayload[]

      return pulls.slice((page - 1) * 100, (page - 1) * 100 + 100)
    }
  )
  const pr = await pullRequests.GetAllPRsLastMonth()

  expect(pr.length).toBe(2)
  expect(pr[1]).toEqual({
    repo: 'stenjo/dora',
    number: 69,
    title: 'feat: handle several repos',
    mergedAt: null,
    baseRef: 'main'
  })
})
