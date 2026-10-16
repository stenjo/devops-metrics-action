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
  warning: Mock<(message: string) => void>
  setOutput: Mock<(name: string, value: unknown) => void>
  setSecret: Mock<(secret: string) => void>
} {
  return {
    getInput: vi.fn((name: string) =>
      name in inputs ? (inputs[name] as string) : ''
    ),
    info: vi.fn(),
    warning: vi.fn(),
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

  it('parses bracketed, newline, comma and space separated repos and trims them', () => {
    const inputs = parseInputs(
      fakeCore({
        token: 't',
        owner: 'testOwner',
        repo: '[ repo1 , repo2]\nrepo3,,\trepo4 repo5'
      }),
      context,
      {}
    )

    expect(inputs.repositories).toEqual([
      'repo1',
      'repo2',
      'repo3',
      'repo4',
      'repo5'
    ])
  })

  it('accepts owner/repo entries and resolves them to the repo name', () => {
    const fake = fakeCore({
      token: 't',
      owner: 'stenjo',
      repo: 'stenjo/devops-metrics-action, other'
    })

    const inputs = parseInputs(fake, context, {})

    expect(inputs.owner).toBe('stenjo')
    expect(inputs.repositories).toEqual(['devops-metrics-action', 'other'])
    expect(fake.info.mock.calls.map(c => c[0])).toEqual([
      'stenjo/devops-metrics-action',
      'stenjo/other',
      '2 repositories registered.'
    ])
  })

  it('matches the owner part of an owner/repo entry case-insensitively', () => {
    const inputs = parseInputs(
      fakeCore({token: 't', owner: 'StenJo', repo: 'stenjo/x'}),
      context,
      {}
    )

    expect(inputs.repositories).toEqual(['x'])
  })

  it('rejects an owner/repo entry whose owner conflicts with the owner input', () => {
    expect(() =>
      parseInputs(
        fakeCore({token: 't', owner: 'stenjo', repo: 'someone-else/x'}),
        context,
        {}
      )
    ).toThrow(
      new Error(
        'Repo "someone-else/x" names owner "someone-else" but the owner input is "stenjo"'
      )
    )
  })

  it('rejects a repo entry with more than one slash', () => {
    expect(() =>
      parseInputs(
        fakeCore({token: 't', owner: 'o', repo: 'a/b/c'}),
        context,
        {}
      )
    ).toThrow(
      new Error('Invalid repo "a/b/c": expected "name" or "owner/name"')
    )
  })

  it('rejects a path-traversal repo before any token handling', () => {
    const fake = fakeCore({token: 't', owner: 'o', repo: '../../x'})

    expect(() => parseInputs(fake, context, {})).toThrow(
      new Error('Invalid repo "../../x": expected "name" or "owner/name"')
    )
    expect(fake.setSecret).not.toHaveBeenCalled()
  })

  it.each([
    ['a..b', 'contains ".."'],
    ['a~b', 'contains an invalid character'],
    ['!abc', 'starts with an invalid character'],
    ['abc!', 'ends with an invalid character'],
    ['a\\b', 'contains a backslash'],
    ['a%2F..%2Fb', 'contains percent-encoding'],
    ['\u00e5rhus', 'contains non-ASCII letters'],
    ['a'.repeat(101), 'is longer than 100 characters']
  ])("rejects repo '%s' because it %s", repo => {
    expect(() =>
      parseInputs(fakeCore({token: 't', owner: 'o', repo}), context, {})
    ).toThrow(
      new Error(
        `Invalid repo ${JSON.stringify(repo)}: GitHub names may only contain letters, digits, "_", "." and "-" (1-100 characters) and must not contain ".."`
      )
    )
  })

  it.each([
    'abc',
    'ABC',
    '019',
    'a_b',
    'a.b',
    'a-b',
    '.github',
    '-',
    'a'.repeat(100)
  ])("accepts repo '%s'", repo => {
    const inputs = parseInputs(
      fakeCore({token: 't', owner: 'o', repo}),
      context,
      {}
    )

    expect(inputs.repositories).toEqual([repo])
  })

  it.each([
    ['..', 'contains ".."'],
    ['own er', 'contains a space'],
    ['own/er', 'contains a slash'],
    ['own\ner', 'contains a newline'],
    ['o'.repeat(101), 'is longer than 100 characters']
  ])("rejects owner '%s' because it %s", owner => {
    expect(() =>
      parseInputs(fakeCore({token: 't', owner, repo: 'r'}), context, {})
    ).toThrow(
      new Error(
        `Invalid owner ${JSON.stringify(owner)}: GitHub names may only contain letters, digits, "_", "." and "-" (1-100 characters) and must not contain ".."`
      )
    )
  })

  it('rejects the owner part of an owner/repo entry as an owner', () => {
    expect(() =>
      parseInputs(fakeCore({token: 't', owner: 'o', repo: '../r'}), context, {})
    ).toThrow('Invalid owner ".."')
  })

  it('validates the context fallback owner and repo too', () => {
    const badContext: ActionsContext = {
      repo: {owner: 'ok', repo: 'bad~name'}
    }

    expect(() => parseInputs(fakeCore({token: 't'}), badContext, {})).toThrow(
      'Invalid repo "bad~name"'
    )
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
    ['', false],
    ['yes', false]
  ])("maps logging input '%s' to %s", (value, expected) => {
    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o', logging: value}),
      context,
      {}
    )

    expect(inputs.logging).toBe(expected)
  })

  it.each(['yes', '1', 'TRUE', 'True '])(
    "warns about the unrecognised logging value '%s' and treats it as false",
    value => {
      const fake = fakeCore({token: 't', repo: 'r', owner: 'o', logging: value})

      const inputs = parseInputs(fake, context, {})

      expect(inputs.logging).toBe(false)
      expect(fake.warning).toHaveBeenCalledExactlyOnceWith(
        `Unrecognised value ${JSON.stringify(value)} for input 'logging': expected 'true' or 'false', treating it as false`
      )
    }
  )

  it("warns about an unrecognised filtered value naming the 'filtered' input", () => {
    const fake = fakeCore({token: 't', repo: 'r', owner: 'o', filtered: 'on'})

    parseInputs(fake, context, {})

    expect(fake.warning).toHaveBeenCalledExactlyOnceWith(
      `Unrecognised value "on" for input 'filtered': expected 'true' or 'false', treating it as false`
    )
  })

  it.each(['true', 'false', ''])(
    "does not warn for the recognised flag value '%s'",
    value => {
      const fake = fakeCore({
        token: 't',
        repo: 'r',
        owner: 'o',
        logging: value,
        filtered: value
      })

      parseInputs(fake, context, {})

      expect(fake.warning).not.toHaveBeenCalled()
    }
  )

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

  it("trims the 'bug-label' input", () => {
    const inputs = parseInputs(
      fakeCore({
        token: 't',
        repo: 'r',
        owner: 'o',
        'bug-label': '  type: bug '
      }),
      context,
      {}
    )

    expect(inputs.bugLabel).toBe('type: bug')
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '  \t']
  ])("defaults 'bug-label' to 'bug' when the input is %s", (_label, value) => {
    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o', 'bug-label': value}),
      context,
      {}
    )

    expect(inputs.bugLabel).toBe('bug')
  })

  it("accepts a 50 character 'bug-label'", () => {
    const label = 'b'.repeat(50)

    const inputs = parseInputs(
      fakeCore({token: 't', repo: 'r', owner: 'o', 'bug-label': label}),
      context,
      {}
    )

    expect(inputs.bugLabel).toBe(label)
  })

  it("rejects a 'bug-label' longer than 50 characters after trimming", () => {
    const label = 'b'.repeat(51)

    expect(() =>
      parseInputs(
        fakeCore({
          token: 't',
          repo: 'r',
          owner: 'o',
          'bug-label': ` ${label} `
        }),
        context,
        {}
      )
    ).toThrow(
      new Error(
        `Invalid bug-label ${JSON.stringify(label)}: must be at most 50 characters`
      )
    )
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
      {
        kind: 'release',
        repo: 'o/r',
        at: '2023-04-22T20:28:29Z',
        name: 'v0.0.2'
      },
      {kind: 'release', repo: 'o/r', at: '2023-04-12T22:33:24Z', name: 'v0.0.1'}
    ])
    ;(LeadTime.prototype.getLeadTime as Mock).mockResolvedValue(10)
    ;(LeadTime.prototype.getLog as Mock).mockReturnValue([
      {
        kind: 'pull',
        repo: 'o/r',
        at: '2023-04-28T17:50:53Z',
        title: 'feat: something',
        commitAt: '2023-04-20T00:00:00Z',
        commitMessage: 'first',
        releaseAt: '2023-04-30T17:50:53Z',
        release: 'v1.0.0',
        leadTimeDays: 10.74
      }
    ])
    ;(ChangeFailureRate.prototype.Cfr as Mock).mockReturnValue(0.1)
    ;(ChangeFailureRate.prototype.getLog as Mock).mockReturnValue([
      {
        kind: 'failed-release',
        repo: 'o/r',
        at: '2023-04-12T22:33:24Z',
        name: 'v0.0.1',
        bugs: [{number: 3, title: 'bug: x', createdAt: '2023-04-13T00:00:00Z'}]
      }
    ])
    ;(MeanTimeToRestore.prototype.mttr as Mock).mockReturnValue(3)
    ;(MeanTimeToRestore.prototype.getLog as Mock).mockReturnValue([
      {
        kind: 'restore',
        repo: 'o/r',
        number: 3,
        title: 'bug: x',
        createdAt: '2023-04-13T00:00:00Z',
        closedAt: '2023-04-14T00:00:00Z',
        releaseBefore: 'v0.0.1',
        releaseBeforeAt: '2023-04-12T22:33:24Z',
        releaseAfter: 'v0.0.2',
        releaseAfterAt: '2023-04-22T20:28:29Z',
        restoreDays: 9.91
      }
    ])
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
      'deploy-rate-log':
        '[{"kind":"release","repo":"o/r","at":"2023-04-22T20:28:29Z","name":"v0.0.2"},' +
        '{"kind":"release","repo":"o/r","at":"2023-04-12T22:33:24Z","name":"v0.0.1"}]',
      'lead-time': 10,
      'lead-time-log':
        '[{"kind":"pull","repo":"o/r","at":"2023-04-28T17:50:53Z","title":"feat: something",' +
        '"commitAt":"2023-04-20T00:00:00Z","commitMessage":"first",' +
        '"releaseAt":"2023-04-30T17:50:53Z","release":"v1.0.0","leadTimeDays":10.74}]',
      'change-failure-rate': 0.1,
      'change-failure-rate-log':
        '[{"kind":"failed-release","repo":"o/r","at":"2023-04-12T22:33:24Z","name":"v0.0.1",' +
        '"bugs":[{"number":3,"title":"bug: x","createdAt":"2023-04-13T00:00:00Z"}]}]',
      mttr: 3,
      'mttr-log':
        '[{"kind":"restore","repo":"o/r","number":3,"title":"bug: x",' +
        '"createdAt":"2023-04-13T00:00:00Z","closedAt":"2023-04-14T00:00:00Z",' +
        '"releaseBefore":"v0.0.1","releaseBeforeAt":"2023-04-12T22:33:24Z",' +
        '"releaseAfter":"v0.0.2","releaseAfterAt":"2023-04-22T20:28:29Z",' +
        '"restoreDays":9.91}]'
    }
    expect(outputs).toEqual(expected)
    expect(fake.setOutput.mock.calls).toEqual(Object.entries(expected))
    expect(JSON.parse(outputs['deploy-rate-log'] as string)).toHaveLength(2)
    expect(JSON.parse(outputs['lead-time-log'] as string)).toHaveLength(1)
    expect(
      JSON.parse(outputs['change-failure-rate-log'] as string)
    ).toHaveLength(1)
    expect(JSON.parse(outputs['mttr-log'] as string)).toHaveLength(1)
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
