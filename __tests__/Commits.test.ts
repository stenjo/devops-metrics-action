import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {GitHubCommitPayload} from '../src/github/payloads'
import fs from 'node:fs'
import * as dotenv from 'dotenv'

dotenv.config()

test('fetches commits', async () => {
  const client = new GitHubClient({token: process.env.GH_TOKEN})
  const adapter = new CommitsAdapter(client)
  vi.spyOn(client, 'request').mockImplementation(
    async (): Promise<GitHubCommitPayload[]> =>
      JSON.parse(
        fs.readFileSync('./__tests__/test-data/commits.json').toString()
      ) as GitHubCommitPayload[]
  )

  const cl = await adapter.getCommitsFromUrl('10')

  expect(cl.length).toBeGreaterThan(-1)
  expect(cl.length).toBe(30)
})

test('CommitsAdapter should', async () => {
  const ca = new CommitsAdapter(new GitHubClient({token: process.env.GH_TOKEN}))

  const result = await ca.getCommitsFromUrl(
    'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
  )

  expect(result).not.toBe(undefined)
  expect(result.length).toBeGreaterThan(7)
})
