import type {PullRequest} from './types/PullRequest'
import type {Release} from './types/Release'
import type {PullLogEntry} from './types/LogEntry'
import type {ICommitsAdapter} from './interfaces/ICommitsAdapter'
import {isoTimestamp} from './types/Timestamp'

type MergedPullRequest = PullRequest & {mergedAt: number}

const ONE_DAY = 24 * 60 * 60 * 1000
export class LeadTime {
  log: PullLogEntry[] = []
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

  getLog(): PullLogEntry[] {
    return this.log
  }
  async getLeadTime(filtered = false): Promise<number> {
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
      const commits = await this.commitsAdapter.getCommitsFromUrl(
        pull.commitsUrl
      )
      const firstCommit = commits.sort(
        (a, b) => a.committedAt - b.committedAt
      )[0]

      const leadTime = (deployTime - firstCommit.committedAt) / ONE_DAY
      leadTimes.push(leadTime)
      this.log.push({
        kind: 'pull',
        at: isoTimestamp(pull.mergedAt),
        title: pull.title,
        commitAt: isoTimestamp(firstCommit.committedAt),
        commitMessage: firstCommit.message,
        releaseAt: isoTimestamp(deployTime),
        release: laterReleases[0].name,
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
