import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import {Octokit} from '@octokit/core'
import {commitPayload} from './helpers/payloads'

vi.mock('@octokit/core')

describe('CommitsAdapter', () => {
  let adapter: CommitsAdapter
  let mockRequest: Mock

  beforeEach(() => {
    mockRequest = vi.fn()
    ;(Octokit as unknown as Mock).mockImplementation(function () {
      return {request: mockRequest}
    })
    adapter = new CommitsAdapter(new GitHubClient({token: 'test-token'}))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch commits with the correct headers and map them', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    mockRequest.mockResolvedValue({
      data: [commitPayload('2023-04-22T17:50:53Z', 'fix: it')]
    })

    const commits = await adapter.getCommitsFromUrl(url)

    expect(mockRequest).toHaveBeenCalledWith(url, {
      headers: {'X-GitHub-Api-Version': '2022-11-28'}
    })
    expect(commits).toEqual([
      {committedAt: +new Date('2023-04-22T17:50:53Z'), message: 'fix: it'}
    ])
  })

  it('should handle missing or incorrect headers', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    mockRequest.mockImplementation((_url, options) => {
      if (
        !options.headers ||
        options.headers['X-GitHub-Api-Version'] !== '2022-11-28'
      ) {
        throw new Error('Incorrect headers')
      }
      return {
        data: [commitPayload()]
      }
    })

    // Test with missing headers
    await expect(adapter.getCommitsFromUrl(url)).resolves.toBeDefined()

    // Test with incorrect headers - the client wraps the error and rethrows it
    mockRequest.mockClear()
    mockRequest.mockImplementation(() => {
      throw new Error('Incorrect headers')
    })
    await expect(adapter.getCommitsFromUrl(url)).rejects.toThrow(
      `GitHub API request failed (unknown) for ${url}`
    )
  })

  it('should rethrow API failures as GitHubApiError without swallowing them', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    const cause = Object.assign(new Error('API call failed'), {status: 502})
    mockRequest.mockRejectedValue(cause)

    const error = await adapter.getCommitsFromUrl(url).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message: `GitHub API request failed (502) for ${url}`,
      status: 502,
      route: url,
      cause
    })
  })

  it('should reject on an empty or invalid URL', async () => {
    const url = ''
    mockRequest.mockRejectedValue(new Error('Invalid URL'))

    await expect(adapter.getCommitsFromUrl(url)).rejects.toThrow(
      'GitHub API request failed (unknown) for '
    )
    expect(mockRequest).toHaveBeenCalled()
  })

  it('should expose the injected client', () => {
    const client = new GitHubClient()
    const adapterWithClient = new CommitsAdapter(client)
    expect(adapterWithClient.client).toBe(client)
  })

  it('should handle empty API response', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    mockRequest.mockResolvedValue({data: []})

    const commits = await adapter.getCommitsFromUrl(url)

    expect(commits).toEqual([])
  })
})
