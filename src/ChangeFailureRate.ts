import type {Issue} from './types/Issue'
import type {Release} from './types/Release'
import type {RepoKey} from './types/RepoKey'
import type {FailedReleaseLogEntry} from './types/LogEntry'
import {isoTimestamp} from './types/Timestamp'

export class ChangeFailureRate {
  today: Date
  issues: Issue[]
  releases: Release[]
  repos: RepoKey[]
  bugLabel: string
  log: FailedReleaseLogEntry[] = []

  constructor(
    issues: Issue[],
    releases: Release[],
    today: Date | null = null,
    bugLabel = 'bug'
  ) {
    this.today = today === null ? new Date() : today
    this.issues = issues
    this.bugLabel = bugLabel
    this.releases = releases
      .sort((a, b) => (a.publishedAt < b.publishedAt ? -1 : 1))
      .filter(
        r => r.publishedAt > this.today.valueOf() - 31 * 24 * 60 * 60 * 1000
      )
    this.repos = []
  }

  getBugs(): Issue[] {
    const bugs: Issue[] = []
    for (const issue of this.issues) {
      if (issue.labels.includes(this.bugLabel)) {
        bugs.push(issue)
      }
    }

    return bugs
  }

  getLog(): FailedReleaseLogEntry[] {
    return this.log
  }

  Cfr(): number {
    if (this.issues.length === 0 || this.releases.length === 0) {
      return 0
    }
    const bugs = this.getBugs()

    for (const bug of bugs) {
      if (!this.repos.includes(bug.repo)) {
        this.repos.push(bug.repo)
      }
    }
    const now = Date.now()

    let failedDeploys = 0
    for (const repo of this.repos) {
      const releasesForRepo = this.releases.filter(r => r.repo === repo)
      for (let i = 0; i < releasesForRepo.length; i++) {
        const release = releasesForRepo[i]
        // The interval after the latest release is closed by "now".
        const nextAt =
          i + 1 < releasesForRepo.length
            ? releasesForRepo[i + 1].publishedAt
            : now
        const bugsInInterval = bugs.filter(
          bug =>
            bug.repo === repo &&
            bug.createdAt > release.publishedAt &&
            bug.createdAt < nextAt
        )
        if (bugsInInterval.length > 0) {
          failedDeploys += 1
          this.log.push({
            kind: 'failed-release',
            at: isoTimestamp(release.publishedAt),
            name: release.name,
            bugs: bugsInInterval.map(bug => ({
              number: bug.number,
              title: bug.title,
              createdAt: isoTimestamp(bug.createdAt)
            }))
          })
        }
      }
    }
    return Math.round((failedDeploys / this.releases.length) * 100)
  }
}
