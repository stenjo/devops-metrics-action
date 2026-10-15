import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {setFailed} from '@actions/core'
import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import fs from 'fs'
import type {Commit} from '../src/types/Commit'
import type {GitHubCommitPayload} from '../src/github/payloads'

const commitsUrl =
  'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
const server = setupServer(
  http.get(
    commitsUrl,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const commits = JSON.parse(
        fs.readFileSync('./__tests__/test-data/commits.json').toString()
      ) as GitHubCommitPayload[]
      return HttpResponse.json(commits)
    }
  )
)
vi.mock('@actions/core', () => ({
  setFailed: vi.fn()
}))

describe('Commit Adapter should', () => {
  beforeAll(() => server.listen())

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return unpaged values', async () => {
    const r = new CommitsAdapter(new GitHubClient())

    const commits: Commit[] = (await r.getCommitsFromUrl(
      commitsUrl
    )) as Commit[]

    expect(commits.length).toBe(30)
    expect(commits[0]).toEqual({
      committedAt: +new Date('2023-04-22T20:41:12Z'),
      message: 'fix: clean up'
    })
  })

  it('handles access denied', async () => {
    server.close()
    const errorServer = setupServer(
      http.get(
        commitsUrl,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({request, params, cookies}) => {
          return new HttpResponse('Bad credentials', {status: 401})
        }
      )
    )
    errorServer.listen()
    const r = new CommitsAdapter(new GitHubClient())
    const result = await r.getCommitsFromUrl(commitsUrl)
    expect(result).toBe(undefined)
    expect(setFailed).toHaveBeenCalledWith('Bad credentials')
    errorServer.close()
  })
})
