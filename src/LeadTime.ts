import type {PullRequest} from './types/PullRequest'
import type {Release} from './types/Release'
import type {PullLogEntry} from './types/LogEntry'
import type {Logger} from './types/Logger'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import {isoTimestamp} from './types/Timestamp'

type MergedPullRequest = PullRequest & {mergedAt: number}

interface Candidate {
  pull: MergedPullRequest
  release: Release
}

export interface LeadTimeLimits {
  // Pull requests whose commits are fetched; the rest are dropped with a warning.
  maxCommitFetches: number
  // Commit requests in flight at once.
  concurrency: number
}

// A function rather than constants so the values are not static mutants for Stryker.
export function defaultLeadTimeLimits(): LeadTimeLimits {
  return {maxCommitFetches: 200, concurrency: 4}
}

// Runs `fn` over `items` with at most `limit` calls in flight; results keep item order.
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({length: limit}, worker))
  return results
}

const ONE_DAY = 24 * 60 * 60 * 1000
export class LeadTime {
  log: PullLogEntry[] = []
  pulls: MergedPullRequest[]
  releases: Release[]
  today: Date
  commitsAdapter: ICommitsAdapter
  private readonly logger: Pick<Logger, 'warning'>
  private readonly limits: LeadTimeLimits

  constructor(
    pulls: PullRequest[],
    releases: Release[],
    commitsAdapter: ICommitsAdapter,
    today: Date | null = null,
    logger: Pick<Logger, 'warning'> = {warning: () => undefined},
    limits: LeadTimeLimits = defaultLeadTimeLimits()
  ) {
    if (today === null) {
      this.today = new Date()
    } else {
      this.today = today
    }

    const since = this.today.valueOf() - 31 * ONE_DAY
    this.pulls = pulls.filter(
      (p): p is MergedPullRequest => p.mergedAt !== null && p.mergedAt > since
    )
    this.releases = releases
    this.commitsAdapter = commitsAdapter
    this.logger = logger
    this.limits = limits
  }

  getLog(): PullLogEntry[] {
    return this.log
  }

  private candidates(filtered: boolean): Candidate[] {
    const candidates: Candidate[] = []
    for (const pull of this.pulls) {
      if (pull.baseRef !== 'main') {
        continue
      }
      if (
        filtered &&
        !(pull.title.startsWith('feat') || pull.title.startsWith('fix'))
      ) {
        continue
      }
      const release = this.releases.find(
        r => r.publishedAt > pull.mergedAt && r.repo === pull.repo
      )
      if (release === undefined) {
        continue
      }
      candidates.push({pull, release})
    }
    return candidates
  }

  async getLeadTime(filtered = false): Promise<number> {
    const candidates = this.candidates(filtered)
    const sampled = candidates.slice(0, this.limits.maxCommitFetches)
    if (sampled.length < candidates.length) {
      this.logger.warning(
        `Lead time: fetching commits for only the first ${sampled.length.toString()} of ${candidates.length.toString()} qualifying pull requests`
      )
    }

    const commitLists = await mapWithConcurrency(
      sampled,
      this.limits.concurrency,
      async ({pull}) => this.commitsAdapter.getCommits(pull.repo, pull.number)
    )

    const leadTimes: number[] = []
    for (const [index, {pull, release}] of sampled.entries()) {
      const deployTime = release.publishedAt
      const firstCommit = commitLists[index].sort(
        (a, b) => a.committedAt - b.committedAt
      )[0]

      const leadTime = (deployTime - firstCommit.committedAt) / ONE_DAY
      leadTimes.push(leadTime)
      this.log.push({
        kind: 'pull',
        repo: pull.repo,
        at: isoTimestamp(pull.mergedAt),
        title: pull.title,
        commitAt: isoTimestamp(firstCommit.committedAt),
        commitMessage: firstCommit.message,
        releaseAt: isoTimestamp(deployTime),
        release: release.name,
        leadTimeDays: Math.round(leadTime * 100) / 100
      })
    }
    if (leadTimes.length === 0) {
      return 0
    }

    return (
      Math.round((leadTimes.reduce((p, c) => p + c) / leadTimes.length) * 100) /
      100
    )
  }
}
