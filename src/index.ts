/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import * as github from '@actions/github'
import { ReleaseAdapter } from './ReleaseAdapter'
import { DeployFrequency } from './DeployFrequency'
import { ChangeFailureRate } from './ChangeFailureRate'
import { Issue } from './types/Issue'
import { IssuesAdapter } from './IssuesAdapter'
import { MeanTimeToRestore } from './MeanTimeToRestore'
import { PullRequestsAdapter } from './PullRequestsAdapter'
import { CommitsAdapter } from './CommitsAdapter'
import { LeadTime } from './LeadTime'
import { Release } from './types/Release'
import { PullRequest } from './types/PullRequest'

async function run(): Promise<void> {
  try {
    let repo: string = core.getInput('repo')
    if (repo === '' || repo === null) {
      repo = github.context.repo.repo
      core.info(`${github.context.repo.repo} - default repo.`)
    }

    // Allow for multiple repos, ex: [val1, val2, val3]
    const repositories = repo
      .split(/[[\]\n,]+/)
      .map(s => s.trim())
      .filter(x => x !== '')

    let owner: string = core.getInput('owner')
    if (owner === '' || owner === null) {
      owner = github.context.repo.owner
      core.info(`${github.context.repo.owner} - default owner.`)
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

    repo = repositories[0]

    let token: string | undefined = core.getInput('token')
    if (token === '' || token === null) {
      // token = github.context.token;
      token = process.env['GH_TOKEN']
    }

    const logging: string | undefined = core.getInput('logging')
    const filtered: boolean | undefined =
      core.getInput('filtered') === 'true' ? true : false

    const rel = new ReleaseAdapter(token, owner, repositories)
    const releaseList = (await rel.GetAllReleasesLastMonth()) as Release[]
    const df = new DeployFrequency(releaseList)
    core.setOutput('deploy-rate', df.rate())
    if (logging === 'true') {
      core.setOutput('deploy-rate-log', df.getLog().join('\n'))
    }

    const prs = new PullRequestsAdapter(token, owner, repositories)
    const commits = new CommitsAdapter(token)
    const pulls = (await prs.GetAllPRsLastMonth()) as PullRequest[]
    const lt = new LeadTime(pulls, releaseList, commits)
    const leadTime = await lt.getLeadTime(filtered)
    core.setOutput('lead-time', leadTime)
    if (logging === 'true') {
      core.setOutput('lead-time-log', lt.getLog().join('\n'))
    }

    const issueAdapter = new IssuesAdapter(token, owner, repositories)
    const issueList: Issue[] | undefined =
      await issueAdapter.GetAllIssuesLastMonth()
    if (issueList) {
      const cfr = new ChangeFailureRate(issueList, releaseList)
      core.setOutput('change-failure-rate', cfr.Cfr())
      const mttr = new MeanTimeToRestore(issueList, releaseList)
      core.setOutput('mttr', mttr.mttr())
    } else {
      core.setOutput('change-failure-rate', 'empty issue list')
      core.setOutput('mttr', 'empty issue list')
    }
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

run()
