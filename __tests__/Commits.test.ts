import { CommitsAdapter } from '../src/CommitsAdapter'
import { Commit } from '../src/types/Commit'
import fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

test('fetches commits', async () => {
  const cmts = new CommitsAdapter(process.env['GH_TOKEN'])
  const getCommitsMock = jest.spyOn(
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    CommitsAdapter.prototype as any,
    'getCommits'
  )
  getCommitsMock.mockImplementation(async (): Promise<Commit[] | undefined> => {
    return Promise.resolve(
      JSON.parse(
        fs.readFileSync('./__tests__/test-data/commits.json').toString()
      ) as Commit[] | undefined
    )
  })

  const cl = (await cmts.getCommitsFromUrl('10')) as Commit[]

  expect(cl.length).toBeGreaterThan(-1)
  expect(cl.length).toBe(30)
})

test.skip('CommitsAdapter should', async () => {
  const ca = new CommitsAdapter(process.env['GH_TOKEN'])

  const result = await ca.getCommitsFromUrl(
    'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
  )

  expect(result).not.toBe(undefined)
  expect((result as Commit[]).length).toBeGreaterThan(7)
})
