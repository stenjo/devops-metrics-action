import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {GitHubCommitPayload} from '../src/github/payloads'
import fs from 'node:fs'
import {commitPayload} from './helpers/payloads'

test('fetches commits', async () => {
  const client = new GitHubClient()
  const adapter = new CommitsAdapter(client)
  vi.spyOn(client, 'request').mockImplementation(
    async (): Promise<GitHubCommitPayload[]> =>
      JSON.parse(
        fs.readFileSync('./__tests__/test-data/commits.json').toString()
      ) as GitHubCommitPayload[]
  )

  const cl = await adapter.getCommits('stenjo/devops-metrics-action', 10)

  expect(cl.length).toBeGreaterThan(-1)
  expect(cl.length).toBe(30)
})

test('CommitsAdapter maps commits returned by GitHub', async () => {
  const client = new GitHubClient()
  const request = vi
    .spyOn(client, 'request')
    .mockImplementation(async (): Promise<GitHubCommitPayload[]> => [
      commitPayload('2024-04-08T00:00:00Z', 'feat: report metrics')
    ])
  const adapter = new CommitsAdapter(client)

  const result = await adapter.getCommits('stenjo/devops-metrics-action', 69)

  expect(result).toEqual([
    {
      committedAt: +new Date('2024-04-08T00:00:00Z'),
      message: 'feat: report metrics'
    }
  ])
  expect(request).toHaveBeenCalledWith(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits',
    {owner: 'stenjo', repo: 'devops-metrics-action', pull_number: 69}
  )
})
