import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
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

    const commits: Commit[] = await r.getCommitsFromUrl(commitsUrl)

    expect(commits.length).toBe(30)
    expect(commits[0]).toEqual({
      committedAt: +new Date('2023-04-22T20:41:12Z'),
      message: 'fix: clean up'
    })
  })

  it('throw a GitHubApiError on access denied', async () => {
    server.use(
      http.get(
        commitsUrl,
        () => new HttpResponse('Bad credentials', {status: 401})
      )
    )
    const r = new CommitsAdapter(new GitHubClient())

    const error = await r.getCommitsFromUrl(commitsUrl).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message: `GitHub API request failed (401) for ${commitsUrl}`,
      status: 401
    })
  })
})
