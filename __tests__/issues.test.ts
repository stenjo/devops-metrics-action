import fs from 'node:fs'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {GitHubIssuePayload} from '../src/github/payloads'
import * as dotenv from 'dotenv'

dotenv.config()

describe.skipIf(!process.env.GH_TOKEN)('Real Issues API should', () => {
  const issueAdapter = new IssuesAdapter(
    new GitHubClient({token: process.env.GH_TOKEN}),
    'stenjo',
    ['dora']
  )

  test('fetch issues', async () => {
    const il = await issueAdapter.GetAllIssuesLastMonth()
    expect(il?.length).toBeGreaterThan(10)
  })
})

describe('mocked Issues API should', () => {
  test('return issues mapped to the domain type', async () => {
    const issueAdapter = new IssuesAdapter(new GitHubClient(), 'stenjo', [
      'devops-metrics-action'
    ])
    mockedGetIssuesReturns('./__tests__/test-data/issue-list.json')

    const il = await issueAdapter.GetAllIssuesLastMonth()
    expect(il?.length).toBe(30)
    expect(il?.[0]).toEqual({
      repo: 'stenjo/devops-metrics-action',
      createdAt: +new Date('2023-04-30T17:28:48Z'),
      closedAt: +new Date('2023-04-30T17:29:33Z'),
      labels: ['autorelease: tagged']
    })
  })
})

function mockedGetIssuesReturns(file: string): void {
  vi.spyOn(GitHubClient.prototype, 'paginate').mockImplementation(
    async (): Promise<GitHubIssuePayload[]> =>
      JSON.parse(fs.readFileSync(file).toString()) as GitHubIssuePayload[]
  )
}
