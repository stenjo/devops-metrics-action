import {ReleaseAdapter} from '../src/ReleaseAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {Release} from '../src/types/Release'
import type {GitHubReleasePayload} from '../src/github/payloads'
import fs from 'node:fs'

describe('Mocked Release API should', () => {
  it('return releases mapped to the domain type', async () => {
    const r = new ReleaseAdapter(new GitHubClient(), 'TestOwner', ['Project1'])
    mockedGetReleasesReturns('./__tests__/test-data/releases.json')

    const releases: Release[] = await r.GetAllReleasesLastMonth()

    expect(releases.length).toBe(7)
    expect(releases[0]).toEqual({
      repo: 'testowner/project1',
      name: 'v0.3.1-beta',
      publishedAt: +new Date('2023-04-30T17:29:44Z')
    })
    expect(releases.reverse()[0].name).toBe('v0.0.1')
  })
})

function mockedGetReleasesReturns(file: string): void {
  vi.spyOn(GitHubClient.prototype, 'paginate').mockImplementation(
    async (): Promise<GitHubReleasePayload[]> =>
      JSON.parse(fs.readFileSync(file).toString()) as GitHubReleasePayload[]
  )
}
