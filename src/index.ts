/* eslint-disable @typescript-eslint/no-explicit-any */
import * as core from '@actions/core'
import * as github from '@actions/github'
import {ReleaseAdapter} from './ReleaseAdapter'
import {DeployFrequency} from './DeployFrequency'
import {ChangeFailureRate} from './ChangeFailureRate'
import {Issue} from './types/Issue'
import {IssuesAdapter} from './IssuesAdapter'
import {MeanTimeToRestore} from './MeanTimeToRestore'
import {PullRequestsAdapter} from './PullRequestsAdapter'
import {CommitsAdapter} from './CommitsAdapter'
import {LeadTime} from './LeadTime'
import {Release} from './types/Release'
import {PullRequest} from './types/PullRequest'

async function run(): Promise<void> {
  try {
    let repo: string = core.getInput('repo')
    if (repo === '' || repo === null) {
      repo = github.context.repo.repo
    }
    // Allow for multiple repos, ex: [val1, val2, val3]
    const repositories = repo
      .split(/[[\]\n,]+/)
      .map(s => s.trim())
      .filter(x => x !== '')

    core.info(`${repositories.length.toString()} repositor(y|ies) registered.`)

    let owner: string = core.getInput('owner')
    if (owner === '' || owner === null) {
      owner = github.context.repo.owner
    }

    for (const repository of repositories) {
      core.info(`${owner}/${repository}`)
    }

    repo = repositories[0]

    let token: string | undefined = core.getInput('token')
    if (token === '' || token === null) {
      // token = github.context.token;
      token = process.env['GH_TOKEN']
    }

    const rel = new ReleaseAdapter(token, owner, repositories)
    const releaselist = (await rel.GetAllReleasesLastMonth()) as Release[]
    const df = new DeployFrequency(releaselist)
    core.setOutput('deploy-rate', df.rate())

    const prs = new PullRequestsAdapter(token, owner, repositories)
    const cmts = new CommitsAdapter(token)
    const pulls = (await prs.GetAllPRsLastMonth()) as PullRequest[]
    const lt = new LeadTime(pulls, releaselist, cmts)
    const leadTime = await lt.getLeadTime()
    core.setOutput('lead-time', leadTime)

    const issueAdapter = new IssuesAdapter(token, owner, repositories)
    const issuelist: Issue[] | undefined =
      await issueAdapter.GetAllIssuesLastMonth()
    if (issuelist) {
      const cfr = new ChangeFailureRate(issuelist, releaselist)
      core.setOutput('change-failure-rate', cfr.Cfr())
      const mttr = new MeanTimeToRestore(issuelist, releaselist)
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
