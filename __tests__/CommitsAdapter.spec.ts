import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import {toPullRequest} from '../src/github/mappers'
import {Octokit} from '@octokit/core'
import {commitPayload, pullRequestPayload} from './helpers/payloads'

vi.mock('@octokit/core')

const route = 'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits'

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

  it('should fetch commits through the route template with the correct headers and map them', async () => {
    mockRequest.mockResolvedValue({
      data: [commitPayload('2023-04-22T17:50:53Z', 'fix: it')]
    })

    const commits = await adapter.getCommits('owner/repo', 42)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledWith(route, {
      owner: 'owner',
      repo: 'repo',
      pull_number: 42,
      headers: {'X-GitHub-Api-Version': '2022-11-28'}
    })
    expect(commits).toEqual([
      {committedAt: +new Date('2023-04-22T17:50:53Z'), message: 'fix: it'}
    ])
  })

  it('should never forward a commits_url from response data', async () => {
    mockRequest.mockResolvedValue({data: []})
    const pull = toPullRequest('o', 'r', {
      ...pullRequestPayload({number: 9}),
      commits_url: 'https://evil.example/repos/o/r/pulls/9/commits'
    })

    await adapter.getCommits(pull.repo, pull.number)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest.mock.calls[0][0]).toBe(route)
    expect(JSON.stringify(mockRequest.mock.calls)).not.toContain('evil.example')
  })

  it('should handle missing or incorrect headers', async () => {
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
    await expect(adapter.getCommits('owner/repo', 1)).resolves.toBeDefined()

    // Test with incorrect headers - the client wraps the error and rethrows it
    mockRequest.mockClear()
    mockRequest.mockImplementation(() => {
      throw new Error('Incorrect headers')
    })
    await expect(adapter.getCommits('owner/repo', 1)).rejects.toThrow(
      `GitHub API request failed (unknown) for ${route}`
    )
  })

  it('should rethrow API failures as GitHubApiError without swallowing them', async () => {
    const cause = Object.assign(new Error('API call failed'), {status: 502})
    mockRequest.mockRejectedValue(cause)

    const error = await adapter
      .getCommits('owner/repo', 1)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect(error).toMatchObject({
      message: `GitHub API request failed (502) for ${route}`,
      status: 502,
      route,
      cause
    })
  })

  it('should expose the injected client', () => {
    const client = new GitHubClient()
    const adapterWithClient = new CommitsAdapter(client)
    expect(adapterWithClient.client).toBe(client)
  })

  it('should handle empty API response', async () => {
    mockRequest.mockResolvedValue({data: []})

    const commits = await adapter.getCommits('owner/repo', 1)

    expect(commits).toEqual([])
  })
})
