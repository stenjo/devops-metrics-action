import fs from 'node:fs'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {Issue} from '../src/types/Issue'
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
  test('return issues', async () => {
    const issueAdapter = new IssuesAdapter(new GitHubClient(), 'stenjo', [
      'dora'
    ])
    mockedGetIssuesReturns('./__tests__/test-data/issue-list.json')

    const il = await issueAdapter.GetAllIssuesLastMonth()
    expect(il?.length).toBe(30)
  })
})

function mockedGetIssuesReturns(file: string): void {
  vi.spyOn(GitHubClient.prototype, 'paginate').mockImplementation(
    async (): Promise<Issue[]> =>
      JSON.parse(fs.readFileSync(file).toString()) as Issue[]
  )
}
