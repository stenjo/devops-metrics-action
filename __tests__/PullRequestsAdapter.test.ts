import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {setFailed} from '@actions/core'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
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
  beforeEach(() => {
    server.listen()
    vi.clearAllMocks()
  })

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return paged values', async () => {
    const r = new PullRequestsAdapter(undefined, 'test-owner', ['project1'])

    const pullRequests: PullRequest[] =
      (await r.GetAllPRsLastMonth()) as PullRequest[]

    expect(pullRequests.length).toBe(150)
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
    const r = new PullRequestsAdapter(undefined, 'test-owner', ['project1'])
    const result = await r.GetAllPRsLastMonth()
    expect(result).toBe(undefined)
    expect(setFailed).toHaveBeenCalledWith('access denied')
    errorServer.close()
  })
})
