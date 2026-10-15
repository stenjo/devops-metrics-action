import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {setFailed} from '@actions/core'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {PullRequest} from '../src/types/PullRequest'

const server = setupServer(
  http.get(
    'https://api.github.com/repos/:owner/:rep/pulls',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const url = new URL(request.url)
      const page = url.searchParams.getAll('page')
      const pullRequests: PullRequest[] = []
      for (let i = 0; i < (+page < 2 ? 100 : 50); i++) {
        pullRequests.push({id: i} as PullRequest)
      }
      return HttpResponse.json(pullRequests)
    }
  )
)
vi.mock('@actions/core', () => ({
  setFailed: vi.fn()
}))

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

    const pullRequests: PullRequest[] =
      (await r.GetAllPRsLastMonth()) as PullRequest[]

    expect(pullRequests.length).toBe(150)
  })

  it('request pulls since 61 days back with auth and api-version headers', async () => {
    const seen: Request[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        ({request}) => {
          seen.push(request)
          return HttpResponse.json([{id: 1}])
        }
      )
    )
    const r = new PullRequestsAdapter(
      new GitHubClient({token: 'my-token'}),
      'test-owner',
      ['project1']
    )
    r.today = new Date('2024-03-01T12:00:00Z')

    await r.GetAllPRsLastMonth()

    expect(seen.length).toBe(1)
    const url = new URL(seen[0].url)
    expect(url.pathname).toBe('/repos/test-owner/project1/pulls')
    expect(url.searchParams.get('state')).toBe('closed')
    expect(url.searchParams.get('since')).toBe('2023-12-31T12:00:00.000Z')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('page')).toBe('1')
    expect(seen[0].headers.get('authorization')).toBe('token my-token')
    expect(seen[0].headers.get('x-github-api-version')).toBe('2022-11-28')
  })

  it('request pages 1 to 99 at most when every page is full', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        ({request}) => {
          pages.push(new URL(request.url).searchParams.get('page') as string)
          return HttpResponse.json(
            Array.from({length: 100}, (_, i) => ({id: i}))
          )
        }
      )
    )
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])

    const pullRequests = (await r.GetAllPRsLastMonth()) as PullRequest[]

    expect(pages.length).toBe(99)
    expect(pages[0]).toBe('1')
    expect(pages[1]).toBe('2')
    expect(pages[98]).toBe('99')
    expect(pullRequests.length).toBe(9900)
  })

  it('handles access denied', async () => {
    server.close()
    const errorServer = setupServer(
      http.get(
        'https://api.github.com/repos/:owner/:rep/pulls',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({request, params, cookies}) => {
          return new HttpResponse('access denied', {status: 401})
        }
      )
    )
    errorServer.listen()
    const r = new PullRequestsAdapter(new GitHubClient(), 'test-owner', [
      'project1'
    ])
    const result = await r.GetAllPRsLastMonth()
    expect(result).toBe(undefined)
    expect(setFailed).toHaveBeenCalledWith('access denied')
    errorServer.close()
  })
})
