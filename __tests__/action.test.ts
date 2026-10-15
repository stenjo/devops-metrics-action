import * as core from '@actions/core'
import * as github from '@actions/github'
import {ReleaseAdapter} from '../src/ReleaseAdapter'
import {DeployFrequency} from '../src/DeployFrequency'
import {ChangeFailureRate} from '../src/ChangeFailureRate'
import {IssuesAdapter} from '../src/IssuesAdapter'
import {MeanTimeToRestore} from '../src/MeanTimeToRestore'
import {PullRequestsAdapter} from '../src/PullRequestsAdapter'
import {CommitsAdapter} from '../src/CommitsAdapter'
import {LeadTime} from '../src/LeadTime'
import {run} from '../src/index'
import type {Release} from '../src/types/Release'
import type {PullRequest} from '../src/types/PullRequest'
import type {Issue} from '../src/types/Issue'

vi.mock('@actions/core')
vi.mock('@actions/github')
vi.mock('../src/ReleaseAdapter')
vi.mock('../src/DeployFrequency')
vi.mock('../src/ChangeFailureRate')
vi.mock('../src/IssuesAdapter')
vi.mock('../src/MeanTimeToRestore')
vi.mock('../src/PullRequestsAdapter')
vi.mock('../src/CommitsAdapter')
vi.mock('../src/LeadTime')

// Mocking github.context.repo as read-only
const mockRepo = {owner: 'defaultOwner', repo: 'defaultRepo'}
Object.defineProperty(github.context, 'repo', {
  get: () => mockRepo
})

function mockInputs(inputs: Record<string, string | null>): void {
  vi.spyOn(core, 'getInput').mockImplementation(
    (name: string) => (name in inputs ? inputs[name] : '') as string
  )
}

describe('run', () => {
  const originalToken = process.env.GH_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GH_TOKEN
    } else {
      process.env.GH_TOKEN = originalToken
    }
  })

  it('should use the provided token input', async () => {
    mockInputs({token: 'provided-token', repo: 'repo1', owner: 'o'})
    process.env.GH_TOKEN = 'env-token'

    await run()

    expect(ReleaseAdapter).toHaveBeenCalledWith('provided-token', 'o', [
      'repo1'
    ])
    expect(PullRequestsAdapter).toHaveBeenCalledWith('provided-token', 'o', [
      'repo1'
    ])
    expect(CommitsAdapter).toHaveBeenCalledWith('provided-token')
    expect(IssuesAdapter).toHaveBeenCalledWith('provided-token', 'o', ['repo1'])
  })

  it('should fall back to GH_TOKEN environment variable if token input is empty', async () => {
    mockInputs({token: '', repo: 'repo1', owner: 'o'})
    process.env.GH_TOKEN = 'env-token'

    await run()

    expect(ReleaseAdapter).toHaveBeenCalledWith('env-token', 'o', ['repo1'])
    expect(CommitsAdapter).toHaveBeenCalledWith('env-token')
  })

  it('should handle a null token input and fall back to GH_TOKEN environment variable', async () => {
    mockInputs({token: null, repo: 'repo1', owner: 'o'})
    process.env.GH_TOKEN = 'env-token'

    await run()

    expect(ReleaseAdapter).toHaveBeenCalledWith('env-token', 'o', ['repo1'])
  })

  it('should use default repo and owner when inputs are not provided', async () => {
    mockInputs({token: 'mock-token', logging: 'false', filtered: 'false'})

    const coreInfoSpy = vi.spyOn(core, 'info')

    await run()

    expect(coreInfoSpy).toHaveBeenCalledWith('defaultRepo - default repo.')
    expect(coreInfoSpy).toHaveBeenCalledWith('defaultOwner - default owner.')
    expect(coreInfoSpy).toHaveBeenCalledWith('defaultOwner/defaultRepo')
    expect(coreInfoSpy).toHaveBeenCalledWith('1 repository registered.')
    expect(coreInfoSpy).not.toHaveBeenCalledWith('1 repositories registered.')
    expect(ReleaseAdapter).toHaveBeenCalledWith('mock-token', 'defaultOwner', [
      'defaultRepo'
    ])
  })

  it('should use default repo and owner when inputs are null', async () => {
    mockInputs({token: 'mock-token', repo: null, owner: null})

    await run()

    expect(ReleaseAdapter).toHaveBeenCalledWith('mock-token', 'defaultOwner', [
      'defaultRepo'
    ])
  })

  it('should not log defaults when repo and owner are provided', async () => {
    mockInputs({token: 'mock-token', repo: 'repo1', owner: 'testOwner'})
    const coreInfoSpy = vi.spyOn(core, 'info')

    await run()

    expect(coreInfoSpy).not.toHaveBeenCalledWith('defaultRepo - default repo.')
    expect(coreInfoSpy).not.toHaveBeenCalledWith(
      'defaultOwner - default owner.'
    )
    expect(ReleaseAdapter).toHaveBeenCalledWith('mock-token', 'testOwner', [
      'repo1'
    ])
  })

  it('should parse bracketed, newline and comma separated repos and trim them', async () => {
    mockInputs({
      token: 'mock-token',
      owner: 'testOwner',
      repo: '[ repo1 , repo2]\nrepo3,,'
    })

    await run()

    expect(ReleaseAdapter).toHaveBeenCalledWith('mock-token', 'testOwner', [
      'repo1',
      'repo2',
      'repo3'
    ])
  })

  it('should handle multiple repositories correctly', async () => {
    mockInputs({token: 'mock-token', owner: 'testOwner', repo: 'repo1,repo2'})

    const coreInfoSpy = vi.spyOn(core, 'info')

    await run()

    expect(coreInfoSpy).toHaveBeenCalledWith('testOwner/repo1')
    expect(coreInfoSpy).toHaveBeenCalledWith('testOwner/repo2')
    expect(coreInfoSpy).toHaveBeenCalledWith('2 repositories registered.')
    expect(coreInfoSpy).not.toHaveBeenCalledWith('2 repository registered.')
  })

  it('should set correct outputs for deploy-rate, lead-time, and logs', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      switch (name) {
        case 'repo':
          return 'repo1'
        case 'owner':
          return 'testOwner'
        case 'token':
          return 'mock-token'
        case 'logging':
          return 'true'
        case 'filtered':
          return 'false'
        default:
          return ''
      }
    })

    const mockReleases = [{}, {}] as Release[] // Mock release objects
    const mockPRs = [{}, {}] as PullRequest[] // Mock pull request objects
    const mockIssues = [{}, {}] as Issue[] // Mock issue objects
    ;(
      ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock
    ).mockResolvedValue(mockReleases)
    ;(
      PullRequestsAdapter.prototype.GetAllPRsLastMonth as Mock
    ).mockResolvedValue(mockPRs)
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      mockIssues
    )
    ;(DeployFrequency.prototype.rate as Mock).mockReturnValue(5)
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

    const coreSetOutputSpy = vi.spyOn(core, 'setOutput')

    await run()

    expect(coreSetOutputSpy).toHaveBeenCalledWith('deploy-rate', 5)
    expect(coreSetOutputSpy).toHaveBeenCalledWith(
      'deploy-rate-log',
      'log1\nlog2'
    )
    expect(coreSetOutputSpy).toHaveBeenCalledWith('lead-time', 10)
    expect(coreSetOutputSpy).toHaveBeenCalledWith(
      'lead-time-log',
      'leadTimeLog1\nleadTimeLog2'
    )
    expect(coreSetOutputSpy).toHaveBeenCalledWith('change-failure-rate', 0.1)
    expect(coreSetOutputSpy).toHaveBeenCalledWith('mttr', 3)
  })

  it('should handle empty issue list case', async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      switch (name) {
        case 'repo':
          return 'repo1'
        case 'owner':
          return 'testOwner'
        case 'token':
          return 'mock-token'
        default:
          return ''
      }
    })
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      undefined
    )

    const coreSetOutputSpy = vi.spyOn(core, 'setOutput')

    await run()

    expect(coreSetOutputSpy).toHaveBeenCalledWith(
      'change-failure-rate',
      'empty issue list'
    )
    expect(coreSetOutputSpy).toHaveBeenCalledWith('mttr', 'empty issue list')
  })

  it('should handle errors and set failure', async () => {
    vi.spyOn(core, 'getInput').mockReturnValue('repo1')
    const coreSetFailedSpy = vi.spyOn(core, 'setFailed')
    ;(
      ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock
    ).mockRejectedValueOnce(new Error('Failed to fetch releases'))

    await run()

    expect(coreSetFailedSpy).toHaveBeenCalledWith('Failed to fetch releases')
  })
  it("should set filtered to true when 'filtered' input is 'true'", async () => {
    mockInputs({token: 't', repo: 'repo1', owner: 'o', filtered: 'true'})

    await run()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(LeadTime.prototype.getLeadTime as Mock).toHaveBeenCalledWith(true)
  })

  it("should set filtered to false when 'filtered' input is 'false'", async () => {
    mockInputs({token: 't', repo: 'repo1', owner: 'o', filtered: 'false'})

    await run()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(LeadTime.prototype.getLeadTime as Mock).toHaveBeenCalledWith(false)
  })

  it("should set filtered to false when 'filtered' input is anything other than 'true'", async () => {
    mockInputs({token: 't', repo: 'repo1', owner: 'o', filtered: ''})

    await run()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(LeadTime.prototype.getLeadTime as Mock).toHaveBeenCalledWith(false)
  })

  it('should not set log outputs when logging is not enabled', async () => {
    mockInputs({token: 't', repo: 'repo1', owner: 'o', logging: 'false'})
    ;(DeployFrequency.prototype.rate as Mock).mockReturnValue(5)
    ;(LeadTime.prototype.getLeadTime as Mock).mockResolvedValue(10)
    const coreSetOutputSpy = vi.spyOn(core, 'setOutput')

    await run()

    expect(coreSetOutputSpy).toHaveBeenCalledWith('deploy-rate', 5)
    expect(coreSetOutputSpy).toHaveBeenCalledWith('lead-time', 10)
    expect(coreSetOutputSpy).not.toHaveBeenCalledWith(
      'deploy-rate-log',
      expect.anything()
    )
    expect(coreSetOutputSpy).not.toHaveBeenCalledWith(
      'lead-time-log',
      expect.anything()
    )
  })

  it("should pass the 'bug-label' input to ChangeFailureRate and MeanTimeToRestore", async () => {
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'bug-label') {
        return 'incident'
      }
      return ''
    })
    const mockIssues = [{}] as Issue[]
    const mockReleases = [{}] as Release[]
    ;(
      ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock
    ).mockResolvedValue(mockReleases)
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      mockIssues
    )

    await run()

    expect(core.getInput).toHaveBeenCalledWith('bug-label')
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

  it("should default 'bug-label' to 'bug' when the input is empty", async () => {
    vi.spyOn(core, 'getInput').mockReturnValue('')
    const mockIssues = [{}] as Issue[]
    const mockReleases = [{}] as Release[]
    ;(
      ReleaseAdapter.prototype.GetAllReleasesLastMonth as Mock
    ).mockResolvedValue(mockReleases)
    ;(IssuesAdapter.prototype.GetAllIssuesLastMonth as Mock).mockResolvedValue(
      mockIssues
    )

    await run()

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
})
