import type {Issue} from './types/Issue'
import type {Release} from './types/Release'
import type {RepoKey} from './types/RepoKey'

export class ChangeFailureRate {
  today: Date
  issues: Issue[]
  releases: Release[]
  repos: RepoKey[]
  bugLabel: string

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
    const releaseDates = this.releases.map(release => {
      return {published: release.publishedAt, repo: release.repo}
    })
    for (const repo of this.repos) {
      releaseDates.push({published: Date.now(), repo})
    }

    let failedDeploys = 0
    for (const repo of this.repos) {
      const releasesForRepo = releaseDates.filter(r => r.repo === repo)
      for (let i = 0; i < releasesForRepo.length - 1; i++) {
        if (
          bugs.filter(
            bug =>
              bug.repo === repo &&
              bug.createdAt > releasesForRepo[i].published &&
              bug.createdAt < releasesForRepo[i + 1].published
          ).length > 0
        ) {
          failedDeploys += 1
        }
      }
    }
    return Math.round((failedDeploys / this.releases.length) * 100)
  }
}
