import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {ReleaseAdapter} from '../src/ReleaseAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import type {Release} from '../src/types/Release'
import type {
  GitHubPersonPayload,
  GitHubReleasePayload
} from '../src/github/payloads'
import {releasePayload} from './helpers/payloads'

// Window start is 61 days earlier: 2023-12-31T12:00:00Z.
const TODAY = new Date('2024-03-01T12:00:00Z')
const IN_WINDOW = '2024-02-01T00:00:00Z'
const BEFORE_WINDOW = '2023-12-01T00:00:00Z'

const server = setupServer(
  http.get(
    'https://api.github.com/repos/:owner/:rep/releases',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const url = new URL(request.url)
      const page = url.searchParams.getAll('page')
      const releases: GitHubReleasePayload[] = []
      const author: GitHubPersonPayload = {
        login: '',
        id: 0,
        node_id: '',
        gravatar_id: '',
        url: '',
        html_url: '',
        followers_url: '',
        following_url: '',
        gists_url: '',
        starred_url: '',
        subscriptions_url: '',
        organizations_url: '',
        repos_url: '',
        events_url: '',
        received_events_url: '',
        type: '',
        site_admin: false
      }
      for (let i = 0; i < (+page < 2 ? 100 : 50); i++) {
        releases.push({
          id: i,
          url: '',
          uploadUrl: '',
          author,
          node_id: '',
          tag_name: '',
          target_commitish: '',
          name: `v${i}`,
          draft: false,
          prerelease: false,
          created_at: '',
          published_at: IN_WINDOW,
          assets: [],
          tarball_url: '',
          zipball_url: '',
          body: ''
        })
      }
      return HttpResponse.json(releases)
    }
  )
)

describe('Release Adapter should', () => {
  beforeAll(() => server.listen())

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => server.resetHandlers())

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return paged values mapped to the domain type', async () => {
    const r = new ReleaseAdapter(new GitHubClient(), 'Test-Owner', ['Project1'])
    r.today = TODAY

    const releases: Release[] = await r.GetAllReleasesLastMonth()

    expect(releases.length).toBe(150)
    expect(releases[1]).toEqual({
      repo: 'test-owner/project1',
      name: 'v1',
      publishedAt: +new Date(IN_WINDOW)
    })
  })

  it('key releases by the repository they were requested for', async () => {
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:repo/releases',
        ({params}) =>
          HttpResponse.json([
            releasePayload({name: `${params.repo}`, published_at: IN_WINDOW})
          ])
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'o', [
      'api',
      'api-gateway'
    ])
    r.today = TODAY

    const releases = await r.GetAllReleasesLastMonth()

    expect(releases.map(x => [x.repo, x.name])).toEqual([
      ['o/api', 'api'],
      ['o/api-gateway', 'api-gateway']
    ])
  })

  it('request releases without a since parameter, with auth and api-version headers', async () => {
    const seen: Request[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/releases',
        ({request}) => {
          seen.push(request)
          return HttpResponse.json([
            releasePayload({id: 1, published_at: IN_WINDOW})
          ])
        }
      )
    )
    const r = new ReleaseAdapter(
      new GitHubClient({token: 'my-token'}),
      'test-owner',
      ['project1']
    )
    r.today = TODAY

    await r.GetAllReleasesLastMonth()

    expect(seen.length).toBe(1)
    const url = new URL(seen[0].url)
    expect(url.pathname).toBe('/repos/test-owner/project1/releases')
    expect([...url.searchParams.keys()].sort()).toEqual(['page', 'per_page'])
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(url.searchParams.get('page')).toBe('1')
    expect(seen[0].headers.get('authorization')).toBe('token my-token')
    expect(seen[0].headers.get('x-github-api-version')).toBe('2022-11-28')
  })

  it('stop requesting pages once a page holds a release older than the window', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/releases',
        ({request}) => {
          const page = new URL(request.url).searchParams.get('page') as string
          pages.push(page)
          const items = Array.from({length: 100}, (_, i) =>
            releasePayload({
              name: `p${page}-${i.toString()}`,
              published_at: IN_WINDOW
            })
          )
          if (page === '2') {
            items[98] = releasePayload({
              name: 'old-1',
              published_at: BEFORE_WINDOW
            })
            items[99] = releasePayload({
              name: 'old-2',
              published_at: BEFORE_WINDOW
            })
          }
          return HttpResponse.json(items)
        }
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const releases = await r.GetAllReleasesLastMonth()

    expect(pages).toEqual(['1', '2'])
    expect(releases.length).toBe(198)
    expect(releases.map(x => x.name)).not.toContain('old-1')
    expect(releases.at(-1)?.name).toBe('p2-97')
  })

  it('keep a release published exactly 60 days ago and drop one 62 days ago', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:rep/releases', () =>
        HttpResponse.json([
          releasePayload({name: 'kept', published_at: '2024-01-01T12:00:00Z'}),
          releasePayload({
            name: 'dropped',
            published_at: '2023-12-30T12:00:00Z'
          })
        ])
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const releases = await r.GetAllReleasesLastMonth()

    expect(releases.map(x => x.name)).toEqual(['kept'])
  })

  it('judge drafts without published_at by created_at', async () => {
    server.use(
      http.get('https://api.github.com/repos/:owner/:rep/releases', () =>
        HttpResponse.json([
          releasePayload({
            name: 'recent-draft',
            draft: true,
            published_at: null,
            created_at: IN_WINDOW
          }),
          releasePayload({name: 'v1', published_at: IN_WINDOW}),
          releasePayload({
            name: 'old-draft',
            draft: true,
            published_at: null,
            created_at: BEFORE_WINDOW
          }),
          releasePayload({name: 'v0', published_at: IN_WINDOW})
        ])
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const releases = await r.GetAllReleasesLastMonth()

    expect(releases.map(x => x.name)).toEqual(['recent-draft', 'v1'])
  })

  it('request pages 1 to 99 at most when every page is full', async () => {
    const pages: string[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/releases',
        ({request}) => {
          pages.push(new URL(request.url).searchParams.get('page') as string)
          return HttpResponse.json(
            Array.from({length: 100}, (_, i) =>
              releasePayload({id: i, published_at: IN_WINDOW})
            )
          )
        }
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])
    r.today = TODAY

    const releases = await r.GetAllReleasesLastMonth()

    expect(pages.length).toBe(99)
    expect(pages[0]).toBe('1')
    expect(pages[1]).toBe('2')
    expect(pages[98]).toBe('99')
    expect(releases.length).toBe(9900)
  })

  it('throw a GitHubApiError on access denied', async () => {
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/releases',
        () => new HttpResponse('access denied', {status: 401})
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])

    const error = await r.GetAllReleasesLastMonth().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message:
        'GitHub API request failed (401) for GET /repos/{owner}/{repo}/releases',
      status: 401
    })
  })
})
