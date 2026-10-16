import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHubClient, GitHubApiError} from '../src/GitHubClient'
import {parseInputs, run} from '../src/main'
import type {Inputs} from '../src/main'

vi.mock('@actions/core')
vi.mock('@actions/github')
// Only the client is mocked; GitHubApiError must stay real for instanceof in index.ts.
vi.mock('../src/GitHubClient', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/GitHubClient')>()),
  GitHubClient: vi.fn()
}))
vi.mock('../src/main')

const inputs: Inputs = {
  owner: 'o',
  repositories: ['repo1'],
  token: 'the-token',
  logging: false,
  filtered: false,
  bugLabel: 'bug'
}

// index.ts runs at import time, so each case needs a fresh module instance.
async function importIndex(): Promise<void> {
  vi.resetModules()
  await import('../src/index')
  // Let the floating bootstrap() promise settle.
  await new Promise(resolve => setImmediate(resolve))
}

describe('index.ts bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(parseInputs).mockReturnValue(inputs)
  })

  it('parses inputs from the Actions runtime and runs with a client built from the token', async () => {
    await importIndex()

    expect(parseInputs).toHaveBeenCalledWith(core, github.context, process.env)
    expect(GitHubClient).toHaveBeenCalledWith({
      token: 'the-token',
      logger: core
    })
    expect(run).toHaveBeenCalledWith({
      inputs,
      client: vi.mocked(GitHubClient).mock.instances[0],
      core
    })
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('reports a failing run through core.setFailed', async () => {
    vi.mocked(run).mockRejectedValueOnce(new Error('Failed to fetch releases'))

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to fetch releases')
    expect(core.error).not.toHaveBeenCalled()
  })

  it('sets the stable GitHubApiError message and logs the raw cause separately', async () => {
    const cause = Object.assign(new Error('Forbidden: https://x/y {body}'), {
      status: 403
    })
    vi.mocked(run).mockRejectedValueOnce(new GitHubApiError('GET /x', cause))

    await importIndex()

    expect(core.error).toHaveBeenCalledWith('Forbidden: https://x/y {body}')
    expect(core.setFailed).toHaveBeenCalledWith(
      'GitHub API request failed (403) for GET /x'
    )
    expect(core.setFailed).toHaveBeenCalledTimes(1)
  })

  it('does not log a cause that is not an Error', async () => {
    vi.mocked(run).mockRejectedValueOnce(new GitHubApiError('GET /x', 'boom'))

    await importIndex()

    expect(core.error).not.toHaveBeenCalled()
    expect(core.setFailed).toHaveBeenCalledWith(
      'GitHub API request failed (unknown) for GET /x'
    )
  })

  it('stringifies non-Error rejections', async () => {
    vi.mocked(run).mockRejectedValueOnce('boom')

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledWith('boom')
  })

  it('reports input parsing failures through core.setFailed without running', async () => {
    vi.mocked(parseInputs).mockImplementationOnce(() => {
      throw new Error('bad input')
    })

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledWith('bad input')
    expect(run).not.toHaveBeenCalled()
  })
})

describe('index.ts token resolution (real parseInputs)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const actual =
      await vi.importActual<typeof import('../src/main')>('../src/main')
    vi.mocked(parseInputs).mockImplementation(actual.parseInputs)
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'repo' ? 'repo1' : name === 'owner' ? 'o' : ''
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fails before building a client when neither the token input nor GH_TOKEN is set', async () => {
    vi.stubEnv('GH_TOKEN', undefined)

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
      'A GitHub token is required: set the `token` input or the GH_TOKEN environment variable'
    )
    expect(GitHubClient).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  it('registers a GH_TOKEN-sourced token as a secret before building the client', async () => {
    vi.stubEnv('GH_TOKEN', 'env-secret')

    await importIndex()

    expect(core.setSecret).toHaveBeenCalledExactlyOnceWith('env-secret')
    expect(GitHubClient).toHaveBeenCalledWith({
      token: 'env-secret',
      logger: core
    })
    expect(vi.mocked(core.setSecret).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(GitHubClient).mock.invocationCallOrder[0]
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('fails with a validation message before any API call when repo is a path traversal', async () => {
    vi.stubEnv('GH_TOKEN', 'env-secret')
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'repo' ? '../../x' : name === 'owner' ? 'o' : ''
    )

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
      'Invalid repo "../../x": expected "name" or "owner/name"'
    )
    expect(GitHubClient).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  it('resolves an owner/repo entry and runs against the repo name', async () => {
    vi.stubEnv('GH_TOKEN', 'env-secret')
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'repo'
        ? 'stenjo/devops-metrics-action'
        : name === 'owner'
          ? 'stenjo'
          : ''
    )

    await importIndex()

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({
          owner: 'stenjo',
          repositories: ['devops-metrics-action']
        }) as Inputs
      })
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('warns and treats an unrecognised logging value as false', async () => {
    vi.stubEnv('GH_TOKEN', 'env-secret')
    vi.mocked(core.getInput).mockImplementation((name: string) =>
      name === 'repo'
        ? 'repo1'
        : name === 'owner'
          ? 'o'
          : name === 'logging'
            ? 'yes'
            : ''
    )

    await importIndex()

    expect(core.warning).toHaveBeenCalledExactlyOnceWith(
      `Unrecognised value "yes" for input 'logging': expected 'true' or 'false', treating it as false`
    )
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({logging: false}) as Inputs
      })
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
