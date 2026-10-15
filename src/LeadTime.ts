import type {PullRequest} from './types/PullRequest'
import type {Release} from './types/Release'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import type {Commit} from './types/Commit'
import {isoTimestamp} from './types/Timestamp'

type MergedPullRequest = PullRequest & {mergedAt: number}

const ONE_DAY = 24 * 60 * 60 * 1000
export class LeadTime {
  log: string[] = []
  pulls: MergedPullRequest[]
  releases: Release[]
  today: Date
  commitsAdapter: ICommitsAdapter

  constructor(
    pulls: PullRequest[],
    releases: Release[],
    commitsAdapter: ICommitsAdapter,
    today: Date | null = null
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
  }

  getLog(): string[] {
    return this.log
  }
  async getLeadTime(filtered = false): Promise<number> {
    if (this.pulls.length === 0 || this.releases.length === 0) {
      return 0
    }

    if (filtered) {
      this.log.push(`\nLog is filtered - only feat and fix.`)
    }

    const leadTimes: number[] = []
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

      const laterReleases = this.releases.filter(
        r => r.publishedAt > pull.mergedAt && r.repo === pull.repo
      )
      if (laterReleases.length === 0) {
        continue
      }
      const deployTime: number = laterReleases[0].publishedAt
      this.log.push(
        `pull->      ${isoTimestamp(pull.mergedAt)} : ${pull.title}`
      )
      const commits = (await this.commitsAdapter.getCommitsFromUrl(
        pull.commitsUrl
      )) as Commit[]
      const firstCommit = commits.sort(
        (a, b) => a.committedAt - b.committedAt
      )[0]
      this.log.push(
        `  commit->  ${isoTimestamp(firstCommit.committedAt)} : ${firstCommit.message}`
      )
      this.log.push(
        `  release-> ${isoTimestamp(laterReleases[0].publishedAt)} : ${laterReleases[0].name}`
      )

      const leadTime = (deployTime - firstCommit.committedAt) / ONE_DAY
      leadTimes.push(leadTime)
      this.log.push(`  ${leadTime.toFixed(2)} days`)
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
