import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import type {PullRequest} from '../src/types/PullRequest'
import type {GitHubPullRequestPayload} from '../src/github/payloads'
import {pullRequestPayload} from './helpers/payloads'

// Window start is 61 days earlier: 2023-12-31T12:00:00Z.
const TODAY = new Date('2024-03-01T12:00:00Z')
const IN_WINDOW = '2024-02-01T00:00:00Z'
const BEFORE_WINDOW = '2023-12-01T00:00:00Z'

const server = setupServer(
  http.get(
    'https://api.github.com/repos/:owner/:rep/pulls',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const url = new URL(request.url)
      const page = url.searchParams.getAll('page')
      const pullRequests: GitHubPullRequestPayload[] = []
      for (let i = 0; i < (+page < 2 ? 100 : 50); i++) {
        pullRequests.push(pullRequestPayload({id: i, updated_at: IN_WINDOW}))
      }
      return HttpResponse.json(pullRequests)
    }
  )
)
describe('PullRequest Adapter should', () => {
  beforeAll(() => server.listen())

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => server.resetHandlers())

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return paged values', async () => {
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])
    r.today = TODAY

    const pullRequests: PullRequest[] = await r.GetAllPRsLastMonth()

    expect(pullRequests.length).toBe(150)
  })

  it('request closed pulls newest-updated first without a since parameter', async () => {
    const seen: Request[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        ({request}) => {
          seen.push(request)
          return HttpResponse.json([
            pullRequestPayload({id: 1, updated_at: IN_WINDOW})
          ])
        }
      )
    )
    const r = new PullRequestsAdapter(
      new GitHubClient({token: 'my-token'}),
      'test-owner',
      ['project1']
    )
    r.today = TODAY

    await r.GetAllPRsLastMonth()

    expect(seen.length).toBe(1)
    const url = new URL(seen[0].url)
    expect(url.pathname).toBe('/repos/test-owner/project1/pulls')
    expect([...url.searchParams.keys()].sort()).toEqual([
      'direction',
      'page',
      'per_page',
      'sort',
      'state'
    ])
    expect(url.searchParams.get('state')).toBe('closed')
    expect(url.searchParams.get('sort')).toBe('updated')
    expect(url.searchParams.get('direction')).toBe('desc')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('page')).toBe('1')
    expect(seen[0].headers.get('authorization')).toBe('token my-token')
    expect(seen[0].headers.get('x-github-api-version')).toBe('2022-11-28')
  })

  it('stop requesting pages once a page holds a pull updated before the window', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        ({request}) => {
          const page = new URL(request.url).searchParams.get('page') as string
          pages.push(page)
          const items = Array.from({length: 100}, (_, i) =>
            pullRequestPayload({
              number: +page * 1000 + i,
              updated_at: IN_WINDOW
            })
          )
          if (page === '2') {
            items[98] = pullRequestPayload({
              number: 1,
              updated_at: BEFORE_WINDOW
            })
            items[99] = pullRequestPayload({
              number: 2,
              updated_at: BEFORE_WINDOW
            })
          }
          return HttpResponse.json(items)
        }
      )
    )
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])
    r.today = TODAY

    const pullRequests = await r.GetAllPRsLastMonth()

    expect(pages).toEqual(['1', '2'])
    expect(pullRequests.length).toBe(198)
    expect(pullRequests.map(x => x.number)).not.toContain(1)
    expect(pullRequests.at(-1)?.number).toBe(2097)
  })

  it('keep a pull updated exactly 60 days ago and drop one 62 days ago', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:rep/pulls', () =>
        HttpResponse.json([
          pullRequestPayload({number: 60, updated_at: '2024-01-01T12:00:00Z'}),
          pullRequestPayload({number: 62, updated_at: '2023-12-30T12:00:00Z'})
        ])
      )
    )
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])
    r.today = TODAY

    const pullRequests = await r.GetAllPRsLastMonth()

    expect(pullRequests.map(x => x.number)).toEqual([60])
  })

  it('request pages 1 to 99 at most when every page is full', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        ({request}) => {
          pages.push(new URL(request.url).searchParams.get('page') as string)
          return HttpResponse.json(
            Array.from({length: 100}, (_, i) =>
              pullRequestPayload({id: i, updated_at: IN_WINDOW})
            )
          )
        }
      )
    )
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])
    r.today = TODAY

    const pullRequests = await r.GetAllPRsLastMonth()

    expect(pages.length).toBe(99)
    expect(pages[0]).toBe('1')
    expect(pages[1]).toBe('2')
    expect(pages[98]).toBe('99')
    expect(pullRequests.length).toBe(9900)
  })

  it('throw a GitHubApiError on access denied', async () => {
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        () => new HttpResponse('access denied', {status: 401})
      )
    )
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])

    const error = await r.GetAllPRsLastMonth().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message:
        'GitHub API request failed (401) for GET /repos/{owner}/{repo}/pulls',
      status: 401
    })
  })
})
