import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import fs from 'fs'
import type {Commit} from '../src/types/Commit'
import type {GitHubCommitPayload} from '../src/github/payloads'

const commitsUrl =
  'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
const route = 'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits'
const requested: string[] = []
const server = setupServer(
  http.get(commitsUrl, ({request}) => {
    requested.push(request.url)
    const commits = JSON.parse(
      fs.readFileSync('./__tests__/test-data/commits.json').toString()
    ) as GitHubCommitPayload[]
    return HttpResponse.json(commits)
  })
)
describe('Commit Adapter should', () => {
  beforeAll(() => server.listen())

  beforeEach(() => {
    vi.clearAllMocks()
    requested.length = 0
  })

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return unpaged values', async () => {
    const r = new CommitsAdapter(new GitHubClient())

    const commits: Commit[] = await r.getCommits(
      'stenjo/devops-metrics-action',
      69
    )

    expect(requested).toEqual([commitsUrl])
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

    const error = await r
      .getCommits('stenjo/devops-metrics-action', 69)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message: `GitHub API request failed (401) for ${route}`,
      status: 401
    })
  })
})
