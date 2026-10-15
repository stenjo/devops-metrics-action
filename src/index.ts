import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHubClient, GitHubApiError} from './GitHubClient'
import {parseInputs, run} from './main'

// Bootstrap only: wires the Actions runtime into the testable run() in main.ts.
async function bootstrap(): Promise<void> {
  try {
    const inputs = parseInputs(core, github.context, process.env)
    await run({inputs, client: new GitHubClient({token: inputs.token}), core})
  } catch (error: unknown) {
    // The raw API error goes to the log only; the failure message stays stable.
    if (error instanceof GitHubApiError && error.cause instanceof Error) {
      core.error(error.cause.message)
    }
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

void bootstrap()
