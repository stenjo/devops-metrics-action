import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import {Octokit} from '@octokit/core'

vi.mock('@octokit/core')

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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates one Octokit authenticated with the token', () => {
      const client = new GitHubClient({token: 'my-token'})

      expect(Octokit).toHaveBeenCalledTimes(1)
      expect(Octokit).toHaveBeenCalledWith({auth: 'my-token'})
      expect(client.octokit).toBeDefined()
    })

    it('creates an unauthenticated Octokit when no options are given', () => {
      new GitHubClient()

      expect(Octokit).toHaveBeenCalledWith({auth: undefined})
      expect(vi.mocked(Octokit).mock.calls[0][0]).not.toHaveProperty('baseUrl')
    })

    it('passes baseUrl through when provided', () => {
      new GitHubClient({token: 't', baseUrl: 'https://ghe.example.com/api/v3'})

      expect(Octokit).toHaveBeenCalledWith({
        auth: 't',
        baseUrl: 'https://ghe.example.com/api/v3'
      })
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

    it('requests pages 1 to 99 at most when every page is full', async () => {
      mockRequest.mockResolvedValue({data: page(100)})
      const client = new GitHubClient()

      const result = await client.paginate('GET /x')

      expect(mockRequest).toHaveBeenCalledTimes(99)
      expect(mockRequest.mock.calls[0][1].page).toBe(1)
      expect(mockRequest.mock.calls[98][1].page).toBe(99)
      expect(result.length).toBe(9900)
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
