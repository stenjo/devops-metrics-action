import * as core from '@actions/core'
import {ReleaseAdapter} from '../src/ReleaseAdapter'
import {DeployFrequency} from '../src/DeployFrequency'
import {ChangeFailureRate} from '../src/ChangeFailureRate'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {MeanTimeToRestore} from '../src/MeanTimeToRestore'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {CommitsAdapter} from '../src/CommitsAdapter'
import {LeadTime} from '../src/LeadTime'
import type {GitHubClient} from '../src/GitHubClient'
import {parseInputs, run, TOKEN_REQUIRED_MESSAGE} from '../src/main'
import type {ActionsContext, Inputs} from '../src/main'
import type {Release} from '../src/types/Release'
import type {PullRequest} from '../src/types/PullRequest'
import type {Issue} from '../src/types/Issue'

vi.mock('@actions/core')
vi.mock('../src/ReleaseAdapter')
vi.mock('../src/DeployFrequency')
vi.mock('../src/ChangeFailureRate')
vi.mock('../src/IssuesAdapter')
vi.mock('../src/MeanTimeToRestore')
vi.mock('../src/PullRequestsAdapter')
vi.mock('../src/CommitsAdapter')
vi.mock('../src/LeadTime')

const context: ActionsContext = {
  repo: {owner: 'defaultOwner', repo: 'defaultRepo'}
}

// Mirrors github.context.repo outside Actions: throws unless the fallback is needed.
const throwingContext: ActionsContext = {
  get repo(): never {
    throw new Error('context.repo requires a GITHUB_REPOSITORY')
  }
}

function fakeCore(inputs: Record<string, string | null>): {
  getInput: Mock<(name: string) => string>
  info: Mock<(message: string) => void>
  setOutput: Mock<(name: string, value: unknown) => void>
  setSecret: Mock<(secret: string) => void>
} {
  return {
    getInput: vi.fn((name: string) =>
      name in inputs ? (inputs[name] as string) : ''
    ),
    info: vi.fn(),
    setOutput: vi.fn(),
    setSecret: vi.fn()
  }
}

describe('main.ts', () => {
  it('performs no I/O when imported', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.resetModules()

    await import('../src/main')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(core.setOutput).not.toHaveBeenCalled()
    expect(core.getInput).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})

describe('parseInputs', () => {
  it('uses the provided token, owner and repo inputs without touching the context', () => {
    const inputs = parseInputs(
      fakeCore({token: 'provided-token', repo: 'repo1', owner: 'o'}),
      throwingContext,
      {GH_TOKEN: 'env-token'}
    )

    expect(inputs).toEqual<Inputs>({
      owner: 'o',
      repositories: ['repo1'],
      token: 'provided-token',
      logging: false,
      filtered: false,
      bugLabel: 'bug'
    })
  })

  it('falls back to GH_TOKEN when the token input is empty', () => {
    const fake = fakeCore({token: '', repo: 'repo1', owner: 'o'})

    const inputs = parseInputs(fake, context, {GH_TOKEN: 'env-token'})

    expect(inputs.token).toBe('env-token')
    expect(fake.setSecret).toHaveBeenCalledExactlyOnceWith('env-token')
  })

  it('falls back to GH_TOKEN when the token input is null', () => {
    const inputs = parseInputs(
      fakeCore({token: null, repo: 'repo1', owner: 'o'}),
      context,
      {GH_TOKEN: 'env-token'}
    )

    expect(inputs.token).toBe('env-token')
  })

  it('registers the provided token input as a secret', () => {
    const fake = fakeCore({token: 'provided-token', repo: 'repo1', owner: 'o'})

    parseInputs(fake, context, {GH_TOKEN: 'env-token'})

    expect(fake.setSecret).toHaveBeenCalledExactlyOnceWith('provided-token')
  })

  it.each([
    ['GH_TOKEN unset', {}],
    ['GH_TOKEN empty', {GH_TOKEN: ''}]
  ])(
    'fails with the required-token message when the token input is empty and %s',
    (_label, env) => {
      const fake = fakeCore({repo: 'repo1', owner: 'o'})

      expect(() => parseInputs(fake, context, env)).toThrow(
        new Error(TOKEN_REQUIRED_MESSAGE)
      )
      expect(fake.setSecret).not.toHaveBeenCalled()
    }
  )

  it('names both the input and the environment variable in the required-token message', () => {
    expect(TOKEN_REQUIRED_MESSAGE).toBe(
      'A GitHub token is required: set the `token` input or the GH_TOKEN environment variable'
    )
  })

  it('uses the context repo and owner when inputs are not provided and logs it', () => {
    const fake = fakeCore({token: 'mock-token', logging: 'false'})

    const inputs = parseInputs(fake, context, {})

    expect(inputs.owner).toBe('defaultOwner')
    expect(inputs.repositories).toEqual(['defaultRepo'])
    expect(fake.info.mock.calls.map(c => c[0])).toEqual([
      'defaultRepo - default repo.',
      'defaultOwner - default owner.',
      'defaultOwner/defaultRepo',
      '1 repository registered.'
    ])
  })

  it('uses the context repo and owner when inputs are null', () => {
    const inputs = parseInputs(
      fakeCore({token: 'mock-token', repo: null, owner: null}),
      context,
      {}
    )

    expect(inputs.owner).toBe('defaultOwner')
    expect(inputs.repositories).toEqual(['defaultRepo'])
  })

  it('does not log defaults when repo and owner are provided', () => {
    const fake = fakeCore({
      token: 'mock-token',
      repo: 'repo1',
      owner: 'testOwner'
    })

    parseInputs(fake, context, {})

    expect(fake.info.mock.calls.map(c => c[0])).toEqual([
      'testOwner/repo1',
      '1 repository registered.'
    ])
  })

  it('parses bracketed, newline and comma separated repos and trims them', () => {
    const inputs = parseInputs(
      fakeCore({
        token: 't',
        owner: 'testOwner',
        repo: '[ repo1 , repo2]\nrepo3,,'
      }),
      context,
      {}
    )

    expect(inputs.repositories).toEqual(['repo1', 'repo2', 'repo3'])
  })

  it('logs every repository and pluralises the count', () => {
    const fake = fakeCore({token: 't', owner: 'testOwner', repo: 'repo1,repo2'})

    parseInputs(fake, context, {})

    expect(fake.info.mock.calls.map(c => c[0])).toEqual([
      'testOwner/repo1',
      'testOwner/repo2',
      '2 repositories registered.'
    ])
  })

  it.each([
    ['true', true],
    ['false', false],
    ['', false],
    ['yes', false]
  ])("maps filtered input '%s' to %s", (value, expected) => {
    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o', filtered: value}),
      context,
      {}
    )

    expect(inputs.filtered).toBe(expected)
  })

  it.each([
    ['true', true],
    ['false', false],
    ['', false]
  ])("maps logging input '%s' to %s", (value, expected) => {
    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o', logging: value}),
      context,
      {}
    )

    expect(inputs.logging).toBe(expected)
  })

  it("passes the 'bug-label' input through", () => {
    const fake = fakeCore({
      token: 't',
      repo: 'r',
      owner: 'o',
      'bug-label': 'incident'
    })

    const inputs = parseInputs(fake, context, {})

    expect(fake.getInput).toHaveBeenCalledWith('bug-label')
    expect(inputs.bugLabel).toBe('incident')
  })

  it("defaults 'bug-label' to 'bug' when the input is empty", () => {
    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o'}),
      context,
      {}
    )

    expect(inputs.bugLabel).toBe('bug')
  })
})

describe('run', () => {
  const client = {} as GitHubClient

  function inputsWith(overrides: Partial<Inputs> = {}): Inputs {
    return {
      owner: 'o',
      repositories: ['repo1'],
      token: 't',
      logging: false,
      filtered: false,
      bugLabel: 'bug',
      ...overrides
    }
  }

  const mockReleases = [{}, {}] as Release[]
  const mockPRs = [{}, {}] as PullRequest[]
  const mockIssues = [{}, {}] as Issue[]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(
      ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock
    ).mockResolvedValue(mockReleases)
    ;(
      PullRequestsAdapter.prototype.GetAllPRsLastMonth as Mock
    ).mockResolvedValue(mockPRs)
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      mockIssues
    )
    ;(DeployFrequency.prototype.rate as Mock).mockReturnValue('5')
    ;(DeployFrequency.prototype.getLog as Mock).mockReturnValue([
      'log1',
      'log2'
    ])
    ;(LeadTime.prototype.getLeadTime as Mock).mockResolvedValue(10)
    ;(LeadTime.prototype.getLog as Mock).mockReturnValue([
      'leadTimeLog1',
      'leadTimeLog2'
    ])
    ;(ChangeFailureRate.prototype.Cfr as Mock).mockReturnValue(0.1)
    ;(MeanTimeToRestore.prototype.mttr as Mock).mockReturnValue(3)
  })

  it('wires the injected client, owner and repositories into every adapter', async () => {
    const inputs = inputsWith({owner: 'o', repositories: ['repo1', 'repo2']})

    await run({inputs, client, core: fakeCore({})})

    expect(ReleaseAdapter).toHaveBeenCalledWith(client, 'o', ['repo1', 'repo2'])
    expect(PullRequestsAdapter).toHaveBeenCalledWith(client, 'o', [
      'repo1',
      'repo2'
    ])
    expect(CommitsAdapter).toHaveBeenCalledWith(client)
    expect(IssuesAdapter).toHaveBeenCalledWith(client, 'o', ['repo1', 'repo2'])
  })

  it('feeds the fetched releases, pulls, commits and issues into the metrics', async () => {
    await run({inputs: inputsWith(), client, core: fakeCore({})})

    const commits = vi.mocked(CommitsAdapter).mock.instances[0]
    expect(DeployFrequency).toHaveBeenCalledWith(mockReleases)
    expect(LeadTime).toHaveBeenCalledWith(mockPRs, mockReleases, commits)
    expect(ChangeFailureRate).toHaveBeenCalledWith(
      mockIssues,
      mockReleases,
      null,
      'bug'
    )
    expect(MeanTimeToRestore).toHaveBeenCalledWith(
      mockIssues,
      mockReleases,
      null,
      'bug'
    )
  })

  it('sets and returns all outputs including logs when logging is enabled', async () => {
    const fake = fakeCore({})

    const outputs = await run({
      inputs: inputsWith({logging: true}),
      client,
      core: fake
    })

    const expected = {
      'deploy-rate': '5',
      'deploy-rate-log': 'log1\nlog2',
      'lead-time': 10,
      'lead-time-log': 'leadTimeLog1\nleadTimeLog2',
      'change-failure-rate': 0.1,
      mttr: 3
    }
    expect(outputs).toEqual(expected)
    expect(fake.setOutput.mock.calls).toEqual(Object.entries(expected))
  })

  it('does not set log outputs when logging is disabled', async () => {
    const fake = fakeCore({})

    const outputs = await run({
      inputs: inputsWith({logging: false}),
      client,
      core: fake
    })

    const expected = {
      'deploy-rate': '5',
      'lead-time': 10,
      'change-failure-rate': 0.1,
      mttr: 3
    }
    expect(outputs).toEqual(expected)
    expect(fake.setOutput.mock.calls).toEqual(Object.entries(expected))
  })

  it('reports an empty issue list instead of computing change-failure-rate and mttr', async () => {
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      []
    )
    const fake = fakeCore({})

    await run({inputs: inputsWith(), client, core: fake})

    expect(ChangeFailureRate).toHaveBeenCalledWith(
      [],
      mockReleases,
      null,
      'bug'
    )
    expect(MeanTimeToRestore).toHaveBeenCalledWith(
      [],
      mockReleases,
      null,
      'bug'
    )
  })

  /* eslint-disable @typescript-eslint/unbound-method */
  it.each([
    ['releases', () => ReleaseAdapter.prototype.GetAllReleasesLastMonth],
    ['pulls', () => PullRequestsAdapter.prototype.GetAllPRsLastMonth],
    ['issues', () => IssuesAdapter.prototype.GetAllIssuesLastMonth],
    ['commits (via lead time)', () => LeadTime.prototype.getLeadTime]
  ])(
    'aborts before any output is set when fetching %s fails',
    async (_name, method) => {
      ;(method() as Mock).mockRejectedValueOnce(new Error('Failed to fetch'))
      const fake = fakeCore({})

      await expect(
        run({inputs: inputsWith(), client, core: fake})
      ).rejects.toThrow('Failed to fetch')
      expect(fake.setOutput).not.toHaveBeenCalled()
    }
  )

  it('fetches releases, pulls and issues before computing any metric', async () => {
    await run({inputs: inputsWith(), client, core: fakeCore({})})

    const order = (m: Mock): number => m.mock.invocationCallOrder[0]
    const lastFetch = Math.max(
      order(ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock),
      order(PullRequestsAdapter.prototype.GetAllPRsLastMonth as Mock),
      order(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock)
    )
    expect(order(vi.mocked(DeployFrequency))).toBeGreaterThan(lastFetch)
    expect(order(vi.mocked(LeadTime))).toBeGreaterThan(lastFetch)
    expect(order(vi.mocked(ChangeFailureRate))).toBeGreaterThan(lastFetch)
    expect(order(vi.mocked(MeanTimeToRestore))).toBeGreaterThan(lastFetch)
  })
  /* eslint-enable @typescript-eslint/unbound-method */

  it.each([true, false])('passes filtered=%s to LeadTime', async filtered => {
    await run({inputs: inputsWith({filtered}), client, core: fakeCore({})})

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(LeadTime.prototype.getLeadTime as Mock).toHaveBeenCalledWith(
      filtered
    )
  })

  it('passes the bug label to ChangeFailureRate and MeanTimeToRestore', async () => {
    await run({
      inputs: inputsWith({bugLabel: 'incident'}),
      client,
      core: fakeCore({})
    })

    expect(ChangeFailureRate).toHaveBeenCalledWith(
      mockIssues,
      mockReleases,
      null,
      'incident'
    )
    expect(MeanTimeToRestore).toHaveBeenCalledWith(
      mockIssues,
      mockReleases,
      null,
      'incident'
    )
  })
})
