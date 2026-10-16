import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import type {Issue} from '../src/types/Issue'
import type {GitHubIssuePayload} from '../src/github/payloads'
import {issuePayload} from './helpers/payloads'

// Window start is 61 days earlier: 2023-12-31T12:00:00Z.
const TODAY = new Date('2024-03-01T12:00:00Z')
const IN_WINDOW = '2024-02-01T00:00:00Z'
const BEFORE_WINDOW = '2023-12-01T00:00:00Z'

const server = setupServer(
  http.get(
    'https://api.github.com/repos/:owner/:rep/issues',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const url = new URL(request.url)
      const page = url.searchParams.getAll('page')
      const issues: GitHubIssuePayload[] = []
      for (let i = 0; i < (+page < 2 ? 100 : 50); i++) {
        issues.push(issuePayload({id: i, updated_at: IN_WINDOW}))
      }
      return HttpResponse.json(issues)
    }
  )
)
describe('Issue Adapter should', () => {
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
    const r = new IssuesAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const issues: Issue[] = await r.GetAllIssuesLastMonth()

    expect(issues.length).toBe(150)
  })

  it('request issues since 61 days back with auth and api-version headers', async () => {
    const seen: Request[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/issues',
        ({request}) => {
          seen.push(request)
          return HttpResponse.json([
            issuePayload({id: 1, updated_at: IN_WINDOW})
          ])
        }
      )
    )
    const r = new IssuesAdapter(
      new GitHubClient({token: 'my-token'}),
      'test-owner',
      ['project1']
    )
    r.today = TODAY

    await r.GetAllIssuesLastMonth()

    expect(seen.length).toBe(1)
    const url = new URL(seen[0].url)
    expect(url.pathname).toBe('/repos/test-owner/project1/issues')
    expect([...url.searchParams.keys()].sort()).toEqual([
      'page',
      'per_page',
      'since',
      'state'
    ])
    expect(url.searchParams.get('state')).toBe('all')
    expect(url.searchParams.get('since')).toBe('2023-12-31T12:00:00.000Z')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('page')).toBe('1')
    expect(seen[0].headers.get('authorization')).toBe('token my-token')
    expect(seen[0].headers.get('x-github-api-version')).toBe('2022-11-28')
  })

  it('stop requesting pages once a page holds an issue updated before the window', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/issues',
        ({request}) => {
          const page = new URL(request.url).searchParams.get('page') as string
          pages.push(page)
          const items = Array.from({length: 100}, (_, i) =>
            issuePayload({number: +page * 1000 + i, updated_at: IN_WINDOW})
          )
          if (page === '2') {
            items[98] = issuePayload({number: 1, updated_at: BEFORE_WINDOW})
            items[99] = issuePayload({number: 2, updated_at: BEFORE_WINDOW})
          }
          return HttpResponse.json(items)
        }
      )
    )
    const r = new IssuesAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const issues = await r.GetAllIssuesLastMonth()

    expect(pages).toEqual(['1', '2'])
    expect(issues.length).toBe(198)
    expect(issues.map(x => x.number)).not.toContain(1)
    expect(issues.at(-1)?.number).toBe(2097)
  })

  it('keep paging past an issue with no updated_at', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:rep/issues', () =>
        HttpResponse.json([
          issuePayload({
            number: 1,
            updated_at: null,
            created_at: BEFORE_WINDOW
          }),
          issuePayload({number: 2, updated_at: IN_WINDOW})
        ])
      )
    )
    const r = new IssuesAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const issues = await r.GetAllIssuesLastMonth()

    expect(issues.map(x => x.number)).toEqual([1, 2])
  })

  it('request pages 1 to 99 at most when every page is full', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/issues',
        ({request}) => {
          pages.push(new URL(request.url).searchParams.get('page') as string)
          return HttpResponse.json(
            Array.from({length: 100}, (_, i) =>
              issuePayload({id: i, updated_at: IN_WINDOW})
            )
          )
        }
      )
    )
    const r = new IssuesAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const issues = await r.GetAllIssuesLastMonth()

    expect(pages.length).toBe(99)
    expect(pages[0]).toBe('1')
    expect(pages[1]).toBe('2')
    expect(pages[98]).toBe('99')
    expect(issues.length).toBe(9900)
  })

  it('throw a GitHubApiError on access denied', async () => {
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/issues',
        () => new HttpResponse('access denied', {status: 401})
      )
    )
    const r = new IssuesAdapter(new GitHubClient(), 'test-owner', ['project1'])

    const error = await r.GetAllIssuesLastMonth().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message:
        'GitHub API request failed (401) for GET /repos/{owner}/{repo}/issues',
      status: 401
    })
  })
})
