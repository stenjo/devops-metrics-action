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
