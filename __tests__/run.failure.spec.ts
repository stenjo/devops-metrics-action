import {Octokit} from '@octokit/core'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import {run} from '../src/main'
import type {Inputs} from '../src/main'
import {releasePayload} from './helpers/payloads'

vi.mock('@octokit/core')

// End-to-end through the real adapters: a failure on the second repo must
// surface as a GitHubApiError before any output is written.
describe('run() with a failing GitHub API', () => {
  const inputs: Inputs = {
    owner: 'o',
    repositories: ['repo1', 'repo2'],
    token: 't',
    logging: false,
    filtered: false,
    bugLabel: 'bug'
  }

  it('aborts with a stable message and sets no outputs when the second repo returns 403', async () => {
    const forbidden = Object.assign(
      new Error('Forbidden: https://api.github.com/repos/o/repo2/releases'),
      {status: 403}
    )
    const request = vi.fn(async (_route: string, params: {repo?: string}) =>
      params.repo === 'repo2'
        ? Promise.reject(forbidden)
        : Promise.resolve({data: [releasePayload({id: 1})]})
    )
    ;(Octokit as unknown as Mock).mockImplementation(function () {
      return {request}
    })
    const core = {info: vi.fn(), setOutput: vi.fn()}

    const error = await run({
      inputs,
      client: new GitHubClient({token: 't'}),
      core
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubApiError)
    expect((error as GitHubApiError).message).toBe(
      'GitHub API request failed (403) for GET /repos/{owner}/{repo}/releases?state=all&since={since}&per_page={per_page}&page={page}'
    )
    expect((error as GitHubApiError).message).not.toContain('Forbidden')
    expect((error as GitHubApiError).cause).toBe(forbidden)
    expect(core.setOutput).not.toHaveBeenCalled()
    expect(request.mock.calls.map(c => c[1].repo)).toEqual(['repo1', 'repo2'])
  })
})
