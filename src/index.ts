import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHubClient} from './GitHubClient'
import {parseInputs, run} from './main'

// Bootstrap only: wires the Actions runtime into the testable run() in main.ts.
async function bootstrap(): Promise<void> {
  try {
    const inputs = parseInputs(core, github.context, process.env)
    await run({inputs, client: new GitHubClient({token: inputs.token}), core})
  } catch (error: unknown) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

void bootstrap()
