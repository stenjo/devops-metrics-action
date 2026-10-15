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
          published_at: '2024-02-01T00:00:00Z',
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

    const releases: Release[] = await r.GetAllReleasesLastMonth()

    expect(releases.length).toBe(150)
    expect(releases[1]).toEqual({
      repo: 'test-owner/project1',
      name: 'v1',
      publishedAt: +new Date('2024-02-01T00:00:00Z')
    })
  })

  it('key releases by the repository they were requested for', async () => {
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:repo/releases',
        ({params}) =>
          HttpResponse.json([releasePayload({name: `${params.repo}`})])
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'o', [
      'api',
      'api-gateway'
    ])

    const releases = await r.GetAllReleasesLastMonth()

    expect(releases.map(x => [x.repo, x.name])).toEqual([
      ['o/api', 'api'],
      ['o/api-gateway', 'api-gateway']
    ])
  })

  it('request releases since 61 days back with auth and api-version headers', async () => {
    const seen: Request[] = []
    server.use(
      http.get(
        'https://api.github.com/repos/:owner/:rep/releases',
        ({request}) => {
          seen.push(request)
          return HttpResponse.json([releasePayload({id: 1})])
        }
      )
    )
    const r = new ReleaseAdapter(
      new GitHubClient({token: 'my-token'}),
      'test-owner',
      ['project1']
    )
    r.today = new Date('2024-03-01T12:00:00Z')

    await r.GetAllReleasesLastMonth()

    expect(seen.length).toBe(1)
    const url = new URL(seen[0].url)
    expect(url.pathname).toBe('/repos/test-owner/project1/releases')
    expect(url.searchParams.get('state')).toBe('all')
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
        'https://api.github.com/repos/:owner/:rep/releases',
        ({request}) => {
          pages.push(new URL(request.url).searchParams.get('page') as string)
          return HttpResponse.json(
            Array.from({length: 100}, (_, i) => releasePayload({id: i}))
          )
        }
      )
    )
    const r = new ReleaseAdapter(new GitHubClient(), 'test-owner', ['project1'])

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
        'GitHub API request failed (401) for GET /repos/{owner}/{repo}/releases?state=all&since={since}&per_page={per_page}&page={page}',
      status: 401
    })
  })
})
