import {ReleaseAdapter} from '../src/ReleaseAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {Release} from '../src/types/Release'
import fs from 'node:fs'

describe('Mocked Release API should', () => {
  it('return releases', async () => {
    const r = new ReleaseAdapter(new GitHubClient(), 'testowner', ['project1'])
    mockedGetReleasesReturns('./__tests__/test-data/releases.json')

    const releases: Release[] = (await r.GetAllReleasesLastMonth()) as Release[]

    expect(releases.length).toBeGreaterThan(0)
    expect(releases[0].author.type).toBe('Bot')
    expect(releases.reverse()[0].name).toBe('v0.0.1')
  })
})

function mockedGetReleasesReturns(file: string): void {
  vi.spyOn(GitHubClient.prototype, 'paginate').mockImplementation(
    async (): Promise<Release[]> =>
      JSON.parse(fs.readFileSync(file).toString()) as Release[]
  )
}
