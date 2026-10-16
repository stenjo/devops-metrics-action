import fs from 'node:fs'
import {windowAt} from './helpers/domain'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {GitHubIssuePayload} from '../src/github/payloads'
import * as dotenv from 'dotenv'

dotenv.config()

describe.skipIf(!process.env.GH_TOKEN)('Real Issues API should', () => {
  const issueAdapter = new IssuesAdapter(
    new GitHubClient({token: process.env.GH_TOKEN}),
    'stenjo',
    ['dora'],
    windowAt()
  )

  test('fetch issues', async () => {
    const il = await issueAdapter.GetAllIssuesLastMonth()
    expect(il?.length).toBeGreaterThan(10)
  })
})

describe('mocked Issues API should', () => {
  test('return issues mapped to the domain type', async () => {
    const issueAdapter = new IssuesAdapter(
      new GitHubClient(),
      'stenjo',
      ['devops-metrics-action'],
      windowAt()
    )
    mockedGetIssuesReturns('./__tests__/test-data/issue-list.json')

    const il = await issueAdapter.GetAllIssuesLastMonth()
    expect(il?.length).toBe(30)
    expect(il?.[0]).toEqual({
      repo: 'stenjo/devops-metrics-action',
      number: 33,
      title: 'chore(main): release 0.3.1-beta',
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
