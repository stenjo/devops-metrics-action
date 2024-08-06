import { Issue } from './types/Issue'
import { Release } from './types/Release'

export class ChangeFailureRate {
  today: Date
  issues: Issue[]
  releases: Release[]
  repos: string[]

  constructor(issues: Issue[], releases: Release[], today: Date | null = null) {
    today === null ? (this.today = new Date()) : (this.today = today)
    this.issues = issues
    this.releases = releases
      .sort((a, b) =>
        +new Date(a.published_at) < +new Date(b.published_at) ? -1 : 1
      )
      .filter(
        r =>
          +new Date(r.published_at) >
          this.today.valueOf() - 31 * 24 * 60 * 60 * 1000
      )
    this.repos = []
  }

  getBugs(): Issue[] {
    const bugs: Issue[] = []
    for (const issue of this.issues) {
      if (issue.labels.filter(label => label.name === 'bug').length > 0) {
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
      const repo = bug.repository_url.split('/').reverse()[0]
      if (!this.repos.includes(repo)) {
        this.repos.push(repo)
      }
    }
    // const bugDates = this.getBugs().map(issue => +new Date(issue.created_at))
    const releaseDates = this.releases.map(function (release) {
      return { published: +new Date(release.published_at), url: release.url }
    })
    for (const repo of this.repos) {
      releaseDates.push({ published: Date.now(), url: repo })
    }

    let failedDeploys = 0
    for (const repo of this.repos) {
      const releasesForRepo = releaseDates.filter(r => r.url.includes(repo))
      for (let i = 0; i < releasesForRepo.length - 1; i++) {
        if (
          bugs.filter(function (bug) {
            if (bug.repository_url.split('/').reverse()[0] !== repo) {
              return false
            }
            const bugDate = +new Date(bug.created_at)
            return (
              bugDate > releasesForRepo[i].published &&
              bugDate < releasesForRepo[i + 1].published
            )
          }).length > 0
        ) {
          failedDeploys += 1
        }
      }
    }
    return Math.round((failedDeploys / this.releases.length) * 100)
  }
}
