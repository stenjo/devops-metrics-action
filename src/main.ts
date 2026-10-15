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

export interface Inputs {
  owner: string
  repositories: string[]
  token: string
  logging: boolean
  filtered: boolean
  bugLabel: string
}

export interface Outputs {
  'deploy-rate': string
  'deploy-rate-log'?: string
  'lead-time': number
  'lead-time-log'?: string
  'change-failure-rate': number
  mttr: number
}

export type ActionsCore = Pick<
  typeof core,
  'getInput' | 'info' | 'setOutput' | 'setSecret'
>

export const TOKEN_REQUIRED_MESSAGE =
  'A GitHub token is required: set the `token` input or the GH_TOKEN environment variable'

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
  core: Pick<ActionsCore, 'info' | 'setOutput'>
}

export function parseInputs(
  core: Pick<ActionsCore, 'getInput' | 'info' | 'setSecret'>,
  context: ActionsContext,
  env: NodeJS.ProcessEnv
): Inputs {
  let repo: string = core.getInput('repo')
  if (repo === '' || repo === null) {
    repo = context.repo.repo
    core.info(`${context.repo.repo} - default repo.`)
  }

  // Allow for multiple repos, ex: [val1, val2, val3]
  const repositories = repo
    .split(/[[\]\n,]+/)
    .map(s => s.trim())
    .filter(x => x !== '')

  let owner: string = core.getInput('owner')
  if (owner === '' || owner === null) {
    owner = context.repo.owner
    core.info(`${context.repo.owner} - default owner.`)
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
    logging: core.getInput('logging') === 'true',
    filtered: core.getInput('filtered') === 'true',
    bugLabel: core.getInput('bug-label') || 'bug'
  }
}

export async function run({inputs, client, core}: RunDeps): Promise<Outputs> {
  const {owner, repositories, logging, filtered, bugLabel} = inputs

  // Fetch everything first so an API failure aborts before any output is set.
  const releaseList = await new ReleaseAdapter(
    client,
    owner,
    repositories
  ).GetAllReleasesLastMonth()
  const pulls = await new PullRequestsAdapter(
    client,
    owner,
    repositories
  ).GetAllPRsLastMonth()
  const issueList = await new IssuesAdapter(
    client,
    owner,
    repositories
  ).GetAllIssuesLastMonth()

  const df = new DeployFrequency(releaseList)
  const lt = new LeadTime(pulls, releaseList, new CommitsAdapter(client))
  const leadTime = await lt.getLeadTime(filtered)
  const cfr = new ChangeFailureRate(issueList, releaseList, null, bugLabel)
  const mttr = new MeanTimeToRestore(issueList, releaseList, null, bugLabel)

  const outputs: Outputs = {
    'deploy-rate': df.rate(),
    ...(logging && {'deploy-rate-log': df.getLog().join('\n')}),
    'lead-time': leadTime,
    ...(logging && {'lead-time-log': lt.getLog().join('\n')}),
    'change-failure-rate': cfr.Cfr(),
    mttr: mttr.mttr()
  }
  for (const [name, value] of Object.entries(outputs)) {
    core.setOutput(name, value)
  }

  return outputs
}
