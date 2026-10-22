import {
  GitHubClient,
  GitHubApiError,
  defaultClientLimits
} from '../src/GitHubClient'
import {Octokit} from '@octokit/core'
import {throttling} from '@octokit/plugin-throttling'
import type {ThrottlingOptions} from '@octokit/plugin-throttling'
import {retry} from '@octokit/plugin-retry'

vi.mock('@octokit/core')

type LimitHandlers = Required<
  Pick<ThrottlingOptions, 'onRateLimit' | 'onSecondaryRateLimit'>
>

function constructorOptions(): Record<string, unknown> & {
  throttle: LimitHandlers
} {
  return vi.mocked(Octokit).mock.calls[0][0] as Record<string, unknown> & {
    throttle: LimitHandlers
  }
}

const requestOptions = {
  method: 'GET',
  url: '/repos/{owner}/{repo}/releases'
} as Parameters<LimitHandlers['onRateLimit']>[1]

describe('GitHubClient', () => {
  let mockRequest: Mock

  beforeEach(() => {
    mockRequest = vi.fn()
    // A class, not an arrow function: the mock is invoked with `new`.
    ;(Octokit as unknown as Mock).mockImplementation(
      class {
        request = mockRequest
      }
    )
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(Octokit.plugin).mockReturnValue(Octokit)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates one Octokit with the throttling and retry plugins, authenticated with the token', () => {
      const client = new GitHubClient({token: 'my-token'})

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(Octokit.plugin).toHaveBeenCalledExactlyOnceWith(throttling, retry)
      expect(Octokit).toHaveBeenCalledTimes(1)
      expect(Octokit).toHaveBeenCalledWith({
        auth: 'my-token',
        throttle: {
          onRateLimit: expect.any(Function) as unknown,
          onSecondaryRateLimit: expect.any(Function) as unknown
        }
      })
      expect(client.octokit).toBeDefined()
    })

    it('creates an unauthenticated Octokit when no options are given', () => {
      new GitHubClient()

      expect(constructorOptions()).toMatchObject({auth: undefined})
      expect(constructorOptions()).not.toHaveProperty('baseUrl')
    })

    it('passes baseUrl through when provided', () => {
      new GitHubClient({token: 't', baseUrl: 'https://ghe.example.com/api/v3'})

      expect(constructorOptions()).toMatchObject({
        auth: 't',
        baseUrl: 'https://ghe.example.com/api/v3'
      })
    })

    it('uses the default limits of 100 items per page and 99 pages', () => {
      expect(new GitHubClient().limits).toEqual({perPage: 100, maxPages: 99})
      expect(defaultClientLimits()).toEqual({perPage: 100, maxPages: 99})
    })

    it('starts with an unknown remaining rate limit', () => {
      expect(new GitHubClient().rateLimitRemaining).toBeUndefined()
    })
  })

  describe('rate-limit handlers', () => {
    let logger: {warning: Mock<(message: string) => void>}

    beforeEach(() => {
      logger = {warning: vi.fn()}
      new GitHubClient({token: 't', logger})
    })

    it('retries once on the primary rate limit and warns with the wait', () => {
      const {onRateLimit} = constructorOptions().throttle

      expect(onRateLimit(42, requestOptions, {} as Octokit, 0)).toBe(true)
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'GitHub API rate limit exhausted for GET /repos/{owner}/{repo}/releases; retrying in 42s'
      )
    })

    it('gives up on the primary rate limit after one retry', () => {
      const {onRateLimit} = constructorOptions().throttle

      expect(onRateLimit(42, requestOptions, {} as Octokit, 1)).toBe(false)
      expect(onRateLimit(42, requestOptions, {} as Octokit, 2)).toBe(false)
      expect(logger.warning).toHaveBeenLastCalledWith(
        'GitHub API rate limit exhausted for GET /repos/{owner}/{repo}/releases; giving up'
      )
    })

    it('never retries on the secondary rate limit and warns', () => {
      const {onSecondaryRateLimit} = constructorOptions().throttle

      expect(onSecondaryRateLimit(60, requestOptions, {} as Octokit, 0)).toBe(
        false
      )
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'GitHub API secondary rate limit hit for GET /repos/{owner}/{repo}/releases; not retrying'
      )
    })

    it('does not fail when no logger is given', () => {
      vi.clearAllMocks()
      new GitHubClient()
      const {onRateLimit, onSecondaryRateLimit} = constructorOptions().throttle

      expect(onRateLimit(1, requestOptions, {} as Octokit, 0)).toBe(true)
      expect(onSecondaryRateLimit(1, requestOptions, {} as Octokit, 0)).toBe(
        false
      )
    })
  })

  describe('request', () => {
    it('refuses absolute URLs so the token never leaves the configured API host', async () => {
      const client = new GitHubClient({token: 't'})

      await expect(
        client.request('https://evil.example/repos/o/r/pulls/1/commits')
      ).rejects.toThrow(
        new TypeError(
          'Refusing to request a non-route URL: https://evil.example/repos/o/r/pulls/1/commits'
        )
      )
      await expect(client.request('')).rejects.toThrow(TypeError)
      await expect(
        client.request('https://evil.example/?q=GET /repos')
      ).rejects.toThrow(TypeError)
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('adds the api-version header and returns data', async () => {
      mockRequest.mockResolvedValue({data: [{id: 1}]})
      const client = new GitHubClient()

      const result = await client.request<{id: number}[]>('GET /x', {
        owner: 'o'
      })

      expect(mockRequest).toHaveBeenCalledWith('GET /x', {
        owner: 'o',
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
      expect(result).toEqual([{id: 1}])
    })

    it('defaults params to an empty object', async () => {
      mockRequest.mockResolvedValue({data: 'ok'})
      const client = new GitHubClient()

      await client.request('GET /x')

      expect(mockRequest).toHaveBeenCalledWith('GET /x', {
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
    })

    it('wraps errors in a GitHubApiError with a stable message, status, route and cause', async () => {
      const cause = Object.assign(new Error('Forbidden: see https://x/y'), {
        status: 403
      })
      mockRequest.mockRejectedValue(cause)
      const client = new GitHubClient()

      const error = await client.request('GET /x').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(GitHubApiError)
      expect(error).toMatchObject({
        name: 'GitHubApiError',
        message: 'GitHub API request failed (403) for GET /x',
        status: 403,
        route: 'GET /x',
        cause
      })
    })

    it('reports an unknown status when the error carries none', async () => {
      mockRequest.mockRejectedValue(new Error('socket hang up'))
      const client = new GitHubClient()

      await expect(client.request('GET /x')).rejects.toMatchObject({
        message: 'GitHub API request failed (unknown) for GET /x',
        status: undefined
      })
    })

    it('reports an unknown status when the status is not a number', async () => {
      mockRequest.mockRejectedValue({status: '403'})
      const client = new GitHubClient()

      await expect(client.request('GET /x')).rejects.toMatchObject({
        message: 'GitHub API request failed (unknown) for GET /x'
      })
    })

    it('wraps non-object rejections too', async () => {
      mockRequest.mockRejectedValue(undefined)
      const client = new GitHubClient()

      await expect(client.request('GET /x')).rejects.toMatchObject({
        message: 'GitHub API request failed (unknown) for GET /x',
        cause: undefined
      })
    })

    it('records the remaining rate limit from the latest response', async () => {
      mockRequest
        .mockResolvedValueOnce({
          data: 1,
          headers: {'x-ratelimit-remaining': '4321'}
        })
        .mockResolvedValueOnce({
          data: 2,
          headers: {'x-ratelimit-remaining': '7'}
        })
      const client = new GitHubClient()

      await client.request('GET /x')
      expect(client.rateLimitRemaining).toBe(4321)

      await client.request('GET /x')
      expect(client.rateLimitRemaining).toBe(7)
    })

    it('keeps the last known remaining rate limit when a response carries none or a malformed value', async () => {
      mockRequest
        .mockResolvedValueOnce({
          data: 1,
          headers: {'x-ratelimit-remaining': '9'}
        })
        .mockResolvedValueOnce({data: 2})
        .mockResolvedValueOnce({data: 3, headers: {}})
        .mockResolvedValueOnce({
          data: 4,
          headers: {'x-ratelimit-remaining': ''}
        })
        .mockResolvedValueOnce({
          data: 5,
          headers: {'x-ratelimit-remaining': '12abc'}
        })
        .mockResolvedValueOnce({
          data: 6,
          headers: {'x-ratelimit-remaining': 'abc12'}
        })
        .mockResolvedValueOnce({data: 7, headers: {'x-ratelimit-remaining': 5}})
      const client = new GitHubClient()

      for (let i = 0; i < 7; i++) {
        await client.request('GET /x')
        expect(client.rateLimitRemaining).toBe(9)
      }
    })
  })

  describe('paginate', () => {
    const page = (length: number, offset = 0): {id: number}[] =>
      Array.from({length}, (_, i) => ({id: offset + i}))

    it('requests page 1 with per_page 100 and the given params', async () => {
      mockRequest.mockResolvedValue({data: page(1)})
      const client = new GitHubClient()

      await client.paginate('GET /repos/{owner}/{repo}/x', {
        owner: 'o',
        repo: 'r'
      })

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/x', {
        owner: 'o',
        repo: 'r',
        per_page: 100,
        page: 1,
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
    })

    it('defaults params to an empty object', async () => {
      mockRequest.mockResolvedValue({data: []})
      const client = new GitHubClient()

      const result = await client.paginate('GET /x')

      expect(result).toEqual([])
      expect(mockRequest).toHaveBeenCalledWith('GET /x', {
        per_page: 100,
        page: 1,
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
    })

    it('concatenates pages until a page is not full', async () => {
      mockRequest
        .mockResolvedValueOnce({data: page(100)})
        .mockResolvedValueOnce({data: page(100, 100)})
        .mockResolvedValueOnce({data: page(50, 200)})
      const client = new GitHubClient()

      const result = await client.paginate<{id: number}>('GET /x')

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls.map(c => c[1].page)).toEqual([1, 2, 3])
      expect(result.length).toBe(250)
      expect(result[0]).toEqual({id: 0})
      expect(result[249]).toEqual({id: 249})
    })

    it('stops after exactly one page when it is empty', async () => {
      mockRequest.mockResolvedValue({data: []})
      const client = new GitHubClient()

      const result = await client.paginate('GET /x')

      expect(result).toEqual([])
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('stops after exactly one page when it has 99 items', async () => {
      mockRequest.mockResolvedValue({data: page(99)})
      const client = new GitHubClient()

      const result = await client.paginate('GET /x')

      expect(result.length).toBe(99)
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('requests pages 1 to 99 at most when every page is full and warns about the cap', async () => {
      mockRequest.mockResolvedValue({data: page(100)})
      const logger = {warning: vi.fn()}
      const client = new GitHubClient({logger})

      const result = await client.paginate('GET /x')

      expect(mockRequest).toHaveBeenCalledTimes(99)
      expect(mockRequest.mock.calls[0][1].page).toBe(1)
      expect(mockRequest.mock.calls[98][1].page).toBe(99)
      expect(result.length).toBe(9900)
      expect(client.wasPageCapped('GET /x')).toBe(true)
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'Stopped paging GET /x after 99 pages (9900 items); results may be incomplete'
      )
    })

    it('honours injected limits and does not warn when paging ends before the cap', async () => {
      mockRequest
        .mockResolvedValueOnce({data: page(5)})
        .mockResolvedValueOnce({data: page(5, 5)})
        .mockResolvedValueOnce({data: page(2, 10)})
      const logger = {warning: vi.fn()}
      const client = new GitHubClient({logger}, {perPage: 5, maxPages: 3})

      const result = await client.paginate('GET /x')

      expect(result.length).toBe(12)
      expect(mockRequest.mock.calls.map(c => c[1].per_page)).toEqual([5, 5, 5])
      expect(client.wasPageCapped('GET /x')).toBe(false)
      expect(logger.warning).not.toHaveBeenCalled()
    })

    it('warns once when the injected page cap is hit', async () => {
      mockRequest.mockResolvedValue({data: page(5)})
      const logger = {warning: vi.fn()}
      const client = new GitHubClient({logger}, {perPage: 5, maxPages: 2})

      const result = await client.paginate('GET /x')

      expect(result.length).toBe(10)
      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(client.wasPageCapped('GET /x')).toBe(true)
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'Stopped paging GET /x after 2 pages (10 items); results may be incomplete'
      )
    })

    it('does not warn when until stops paging on the last allowed page', async () => {
      mockRequest.mockResolvedValue({data: page(5)})
      const logger = {warning: vi.fn()}
      const client = new GitHubClient({logger}, {perPage: 5, maxPages: 1})

      const result = await client.paginate<{id: number}>(
        'GET /x',
        {},
        {until: item => item.id === 3}
      )

      expect(result.length).toBe(3)
      expect(logger.warning).not.toHaveBeenCalled()
    })

    it('stops at the first item matching until and drops it and the rest', async () => {
      mockRequest
        .mockResolvedValueOnce({data: page(100)})
        .mockResolvedValueOnce({data: page(100, 100)})
      const client = new GitHubClient()

      const result = await client.paginate<{id: number}>(
        'GET /x',
        {},
        {until: item => item.id === 150}
      )

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(result.length).toBe(150)
      expect(result[149]).toEqual({id: 149})
    })

    it('returns nothing when the very first item matches until', async () => {
      mockRequest.mockResolvedValue({data: page(100)})
      const client = new GitHubClient()

      const result = await client.paginate<{id: number}>(
        'GET /x',
        {},
        {until: item => item.id === 0}
      )

      expect(result).toEqual([])
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('keeps paging when until never matches', async () => {
      mockRequest
        .mockResolvedValueOnce({data: page(100)})
        .mockResolvedValueOnce({data: page(10, 100)})
      const client = new GitHubClient()

      const result = await client.paginate<{id: number}>(
        'GET /x',
        {},
        {until: () => false}
      )

      expect(result.length).toBe(110)
      expect(mockRequest).toHaveBeenCalledTimes(2)
    })

    it('propagates errors from any page', async () => {
      mockRequest
        .mockResolvedValueOnce({data: page(100)})
        .mockRejectedValueOnce(
          Object.assign(new Error('rate limited'), {
            status: 429
          })
        )
      const client = new GitHubClient()

      await expect(client.paginate('GET /x')).rejects.toThrow(
        'GitHub API request failed (429) for GET /x'
      )
    })
  })
})
