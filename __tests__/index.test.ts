import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHubClient} from '../src/GitHubClient'
import {parseInputs, run} from '../src/main'
import type {Inputs} from '../src/main'

vi.mock('@actions/core')
vi.mock('@actions/github')
vi.mock('../src/GitHubClient')
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
    expect(GitHubClient).toHaveBeenCalledWith({token: 'the-token'})
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
  const savedGhToken = process.env.GH_TOKEN

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
    if (savedGhToken === undefined) {
      delete process.env.GH_TOKEN
    } else {
      process.env.GH_TOKEN = savedGhToken
    }
  })

  it('fails before building a client when neither the token input nor GH_TOKEN is set', async () => {
    delete process.env.GH_TOKEN

    await importIndex()

    expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
      'A GitHub token is required: set the `token` input or the GH_TOKEN environment variable'
    )
    expect(GitHubClient).not.toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  it('registers a GH_TOKEN-sourced token as a secret before building the client', async () => {
    process.env.GH_TOKEN = 'env-secret'

    await importIndex()

    expect(core.setSecret).toHaveBeenCalledExactlyOnceWith('env-secret')
    expect(GitHubClient).toHaveBeenCalledWith({token: 'env-secret'})
    expect(vi.mocked(core.setSecret).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(GitHubClient).mock.invocationCallOrder[0]
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
