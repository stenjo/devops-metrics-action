import {CommitsAdapter} from '../src/CommitsAdapter'
import {Octokit} from '@octokit/core'
import * as core from '@actions/core'
import type {Commit} from '../src/types/Commit'

vi.mock('@octokit/core')
vi.mock('@actions/core')

describe('CommitsAdapter', () => {
  const token = 'test-token'
  let adapter: CommitsAdapter
  let mockRequest: Mock

  beforeEach(() => {
    mockRequest = vi.fn()
    ;(Octokit as unknown as Mock).mockImplementation(function () {
      return {request: mockRequest}
    })
    adapter = new CommitsAdapter(token)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with the correct token', () => {
    expect(Octokit).toHaveBeenCalledWith({
      auth: token
    })
  })

  it('should initialize with an undefined token', () => {
    new CommitsAdapter(undefined)
    expect(Octokit).toHaveBeenCalledWith({
      auth: undefined
    })
  })

  it('should fetch commits with the correct headers', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    const mockCommits: Commit[] = [
      {
        /* mock commit data */
      }
    ]
    mockRequest.mockResolvedValue({data: mockCommits})

    const commits = await adapter.getCommitsFromUrl(url)

    expect(mockRequest).toHaveBeenCalledWith(url, {
      headers: {'X-GitHub-Api-Version': '2022-11-28'}
    })
    expect(commits).toEqual(mockCommits)
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
        data: [
          {
            /* mock commit data */
          }
        ]
      }
    })

    // Test with missing headers
    await expect(adapter.getCommitsFromUrl(url)).resolves.toBeDefined()

    // Test with incorrect headers - error is caught and setFailed is called
    mockRequest.mockClear()
    mockRequest.mockImplementation(() => {
      throw new Error('Incorrect headers')
    })
    const result = await adapter.getCommitsFromUrl(url)
    expect(result).toBeUndefined()
    expect(core.setFailed).toHaveBeenCalledWith('Incorrect headers')
  })

  it('should handle errors during API call', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    const errorMessage = 'API call failed'
    mockRequest.mockRejectedValue(new Error(errorMessage))

    const commits = await adapter.getCommitsFromUrl(url)

    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
    expect(commits).toBeUndefined()
  })

  it('should handle empty or invalid URL', async () => {
    const url = ''
    mockRequest.mockRejectedValue(new Error('Invalid URL'))
    const commits = await adapter.getCommitsFromUrl(url)

    expect(mockRequest).toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith('Invalid URL')
    expect(commits).toBeUndefined()
  })

  it('should handle undefined token gracefully', () => {
    const adapterWithoutToken = new CommitsAdapter(undefined)
    expect(adapterWithoutToken.token).toBeUndefined()
    expect(adapterWithoutToken.octokit).toBeDefined() // Octokit should still be initialized
  })

  it('should handle empty API response', async () => {
    const url = 'https://api.github.com/repos/owner/repo/commits'
    mockRequest.mockResolvedValue({data: []})

    const commits = await adapter.getCommitsFromUrl(url)

    expect(commits).toEqual([])
  })
})
