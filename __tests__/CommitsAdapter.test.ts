import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {setFailed} from '@actions/core'
import {CommitsAdapter} from '../src/CommitsAdapter'
import fs from 'fs'
import {Commit} from '../src/types/Commit'

const commitsUrl =
  'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
const server = setupServer(
  http.get(
    commitsUrl,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const commits: Commit[] = JSON.parse(
        fs.readFileSync('./__tests__/test-data/commits.json').toString()
      ) as Commit[]
      return HttpResponse.json(commits)
    }
  )
)
vi.mock('@actions/core', () => ({
  setFailed: vi.fn()
}))

describe('Commit Adapter should', () => {
  beforeEach(() => {
    server.listen()
    vi.clearAllMocks()
  })

  it('should return commits when the request is successful', async () => {
    const mockCommits = [{sha: '123', commit: {message: 'test commit'}}]
    octokitMock.request.mockResolvedValue({
      data: mockCommits,
      headers: {},
      status: 200,
      url: 'https://api.github.com/repos/user/repo/commits'
    })

    const result = await commitsAdapter.getCommitsFromUrl(
      'https://api.github.com/repos/user/repo/commits'
    )

    expect(result).toEqual(mockCommits)
    expect(octokitMock.request).toHaveBeenCalledWith(
      'https://api.github.com/repos/user/repo/commits',
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: 'token fake-token'
        }
      }
    )
  })

  it('should throw an error and call core.setFailed when the request fails', async () => {
    const errorMessage = 'Request failed'
    octokitMock.request.mockRejectedValue(new Error(errorMessage))

    await expect(
      commitsAdapter.getCommitsFromUrl(
        'https://api.github.com/repos/user/repo/commits'
      )
    ).rejects.toThrow(errorMessage)
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
  })

  it('should throw an error and call core.setFailed when headers are incorrect', async () => {
    const errorMessage = 'Bad headers'
    octokitMock.request.mockRejectedValue(new Error(errorMessage))

    await expect(
      commitsAdapter.getCommitsFromUrl(
        'https://api.github.com/repos/user/repo/commits'
      )
    ).rejects.toThrow(errorMessage)
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
  })

  it('should send the token as an authorization parameter', async () => {
    const mockCommits = [{sha: '123', commit: {message: 'test commit'}}]
    octokitMock.request.mockResolvedValue({
      data: mockCommits,
      headers: {},
      status: 200,
      url: 'https://api.github.com/repos/user/repo/commits'
    })

    await commitsAdapter.getCommitsFromUrl(
      'https://api.github.com/repos/user/repo/commits'
    )

    expect(octokitMock.request).toHaveBeenCalledWith(
      'https://api.github.com/repos/user/repo/commits',
      {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: 'token fake-token'
        }
      }
    )
  })
})
