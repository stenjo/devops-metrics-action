import { ReleaseAdapter } from '../src/ReleaseAdapter'
import { Release } from '../src/types/Release'
import fs from 'fs'

describe('Mocked Release API should', () => {
  it('return releases', async () => {
    const r = new ReleaseAdapter(undefined, 'testowner', ['project1'])
    mockedGetReleasesReturns('./__tests__/test-data/releases.json')

    const releases: Release[] = (await r.GetAllReleasesLastMonth()) as Release[]

    expect(releases.length).toBeGreaterThan(0)
    expect(releases[0].author.type).toBe('Bot')
    expect(releases.reverse()[0].name).toBe('v0.0.1')
  })
})

function mockedGetReleasesReturns(file: string): void {
  const getIssuesMock = jest.spyOn(
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    ReleaseAdapter.prototype as any,
    'getReleases'
  )
  getIssuesMock.mockImplementation(async (): Promise<Release[]> => {
    return Promise.resolve(
      JSON.parse(fs.readFileSync(file).toString()) as Release[]
    )
  })
}
