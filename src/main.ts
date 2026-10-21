import type * as core from '@actions/core'
import type {GitHubClient} from './GitHubClient'
import {ReleaseAdapter} from './ReleaseAdapter'
import {DeployFrequency} from './DeployFrequency'
import {ChangeFailureRate} from './ChangeFailureRate'
import {IssuesAdapter} from './IssuesAdapter'
import {MeanTimeToRestore} from './MeanTimeToRestore'
import {PullRequestsAdapter} from './PullRequestsAdapter'
import {CommitsAdapter} from './CommitsAdapter'
import {LeadTime} from './LeadTime'
import {serializeLog} from './log'
import {metricsWindow} from './MetricsWindow'
import type {Release} from './types/Release'
import type {PullRequest} from './types/PullRequest'

export interface Inputs {
  owner: string
  repositories: string[]
  token: string
  logging: boolean
  filtered: boolean
  bugLabel: string
}

export type MetricName =
  'deploy-rate' | 'lead-time' | 'change-failure-rate' | 'mttr'

// 'no-data' means the metric was defaulted to 0 because there was nothing to compute from.
export type MetricStatus = 'computed' | 'no-data'

export type MetricsStatus = Record<MetricName, MetricStatus>

export interface Outputs {
  'deploy-rate': string
  'deploy-rate-log'?: string
  'lead-time': number
  'lead-time-log'?: string
  'change-failure-rate': number
  'change-failure-rate-log'?: string
  mttr: number
  'mttr-log'?: string
  'metrics-status': string
}

export type ActionsCore = Pick<
  typeof core,
  'getInput' | 'info' | 'warning' | 'setOutput' | 'setSecret'
>

export const TOKEN_REQUIRED_MESSAGE =
  'A GitHub token is required: set the `token` input or the GH_TOKEN environment variable'

// Every repository costs up to three paginated listings plus one request per
// qualifying pull request, so a run is bounded here before any call is made.
export function maxRepositories(): number {
  return 25
}

// GitHub owner and repository names: letters, digits, '_', '.', '-'; 1–100 chars.
function validateName(kind: 'owner' | 'repo', value: string): string {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(value) || value.includes('..')) {
    throw new Error(
      `Invalid ${kind} ${JSON.stringify(value)}: GitHub names may only contain letters, digits, "_", "." and "-" (1-100 characters) and must not contain ".."`
    )
  }
  return value
}

// Accepts `name` or `owner/name`; the owner part must agree with the owner input.
function parseRepoEntry(entry: string, owner: string): string {
  const parts = entry.split('/')
  if (parts.length > 2) {
    throw new Error(
      `Invalid repo ${JSON.stringify(entry)}: expected "name" or "owner/name"`
    )
  }
  if (parts.length === 2) {
    const entryOwner = validateName('owner', parts[0])
    if (entryOwner.toLowerCase() !== owner.toLowerCase()) {
      throw new Error(
        `Repo ${JSON.stringify(entry)} names owner ${JSON.stringify(entryOwner)} but the owner input is ${JSON.stringify(owner)}`
      )
    }
  }
  return validateName('repo', parts[parts.length - 1])
}

function parseBugLabel(value: string): string {
  const label = value.trim()
  if (label === '') {
    return 'bug'
  }
  if (label.length > 50) {
    throw new Error(
      `Invalid bug-label ${JSON.stringify(label)}: must be at most 50 characters`
    )
  }
  return label
}

// Only the literal 'true' enables a flag; anything else is off, loudly if unrecognised.
function parseFlag(
  core: Pick<ActionsCore, 'getInput' | 'warning'>,
  name: string
): boolean {
  const value = core.getInput(name)
  if (value === 'true') {
    return true
  }
  if (value !== '' && value !== 'false') {
    core.warning(
      `Unrecognised value ${JSON.stringify(value)} for input '${name}': expected 'true' or 'false', treating it as false`
    )
  }
  return false
}

export interface RepoContext {
  owner: string
  repo: string
}

// `github.context.repo` is a getter that throws outside Actions, so it must stay lazy.
export interface ActionsContext {
  readonly repo: RepoContext
}

export interface RunDeps {
  inputs: Inputs
  client: GitHubClient
  core: Pick<ActionsCore, 'info' | 'warning' | 'setOutput'>
}

function noDataReason(
  metric: MetricName,
  releases: Release[],
  pulls: PullRequest[]
): string | undefined {
  if (releases.length === 0) {
    return 'no releases in the window'
  }
  if (metric === 'lead-time' && pulls.length === 0) {
    return 'no pull requests in the window'
  }
  return undefined
}

// Reports which metrics have data to compute from, warning once per metric that has none.
export function metricsStatus(
  releases: Release[],
  pulls: PullRequest[],
  core: Pick<ActionsCore, 'warning'>
): MetricsStatus {
  const check = (metric: MetricName): MetricStatus => {
    const reason = noDataReason(metric, releases, pulls)
    if (reason === undefined) {
      return 'computed'
    }
    core.warning(`${metric} defaulted to 0: ${reason}`)
    return 'no-data'
  }
  return {
    'deploy-rate': check('deploy-rate'),
    'lead-time': check('lead-time'),
    'change-failure-rate': check('change-failure-rate'),
    mttr: check('mttr')
  }
}

export function parseInputs(
  core: Pick<ActionsCore, 'getInput' | 'info' | 'warning' | 'setSecret'>,
  context: ActionsContext,
  env: NodeJS.ProcessEnv
): Inputs {
  let repo: string = core.getInput('repo')
  if (repo === '' || repo === null) {
    repo = context.repo.repo
    core.info(`${context.repo.repo} - default repo.`)
  }

  let owner: string = core.getInput('owner')
  if (owner === '' || owner === null) {
    owner = context.repo.owner
    core.info(`${context.repo.owner} - default owner.`)
  }
  owner = validateName('owner', owner)

  // Allow for multiple repos, ex: [val1, val2, val3], one per line or space separated
  const repositories = repo
    .split(/[[\]\s,]+/)
    .filter(x => x !== '')
    .map(entry => parseRepoEntry(entry, owner))

  if (repositories.length > maxRepositories()) {
    throw new Error(
      `Too many repositories (${repositories.length.toString()}): at most ${maxRepositories().toString()} repositories can be analysed in one run`
    )
  }

  for (const repository of repositories) {
    core.info(`${owner}/${repository}`)
  }

  const repoCount = repositories.length
  if (repoCount > 1) {
    core.info(`${repoCount.toString()} repositories registered.`)
  } else {
    core.info(`${repoCount.toString()} repository registered.`)
  }

  let token: string | undefined = core.getInput('token')
  if (token === '' || token === null) {
    token = env.GH_TOKEN
  }
  if (token === undefined || token === '') {
    throw new Error(TOKEN_REQUIRED_MESSAGE)
  }
  // The GH_TOKEN fallback is not masked by the runner unless registered here.
  core.setSecret(token)

  return {
    owner,
    repositories,
    token,
    logging: parseFlag(core, 'logging'),
    filtered: parseFlag(core, 'filtered'),
    bugLabel: parseBugLabel(core.getInput('bug-label'))
  }
}

export async function run({inputs, client, core}: RunDeps): Promise<Outputs> {
  const {owner, repositories, logging, filtered, bugLabel} = inputs
  // The only clock read in src/: every adapter and metric shares this window.
  const window = metricsWindow(new Date())

  // Fetch everything first so an API failure aborts before any output is set.
  const releaseList = await new ReleaseAdapter(
    client,
    owner,
    repositories,
    window
  ).GetAllReleasesLastMonth()
  const pulls = await new PullRequestsAdapter(
    client,
    owner,
    repositories,
    window
  ).GetAllPRsLastMonth()
  const issueList = await new IssuesAdapter(
    client,
    owner,
    repositories,
    window
  ).GetAllIssuesLastMonth()

  const status = metricsStatus(releaseList, pulls, core)

  const df = new DeployFrequency(releaseList, {window})
  const lt = new LeadTime(pulls, releaseList, new CommitsAdapter(client), {
    window,
    logger: core
  })
  const leadTime = await lt.getLeadTime(filtered)
  const cfr = new ChangeFailureRate(issueList, releaseList, {window, bugLabel})
  const mttr = new MeanTimeToRestore(issueList, releaseList, {window, bugLabel})

  const outputs: Outputs = {
    'deploy-rate': df.rate(),
    ...(logging && {'deploy-rate-log': serializeLog(df.getLog())}),
    'lead-time': leadTime,
    ...(logging && {'lead-time-log': serializeLog(lt.getLog())}),
    'change-failure-rate': cfr.Cfr(),
    ...(logging && {'change-failure-rate-log': serializeLog(cfr.getLog())}),
    mttr: mttr.mttr(),
    ...(logging && {'mttr-log': serializeLog(mttr.getLog())}),
    'metrics-status': JSON.stringify(status)
  }
  for (const [name, value] of Object.entries(outputs)) {
    core.setOutput(name, value)
  }

  core.info(
    `GitHub API rate limit remaining: ${client.rateLimitRemaining?.toString() ?? 'unknown'}`
  )

  return outputs
}
