import type {Issue} from './types/Issue'
import type {Release} from './types/Release'
import type {RepoKey} from './types/RepoKey'

export interface BugTime {
  start: number
  end: number
  repo: RepoKey
}

const ONE_DAY = 1000 * 60 * 60 * 24

export class MeanTimeToRestore {
  today: Date
  issues: Issue[]
  releases: Release[] // Sorted ascending by publishedAt
  bugLabel: string

  constructor(
    issues: Issue[],
    releases: Release[],
    today: Date | null = null,
    bugLabel = 'bug'
  ) {
    if (today === null) {
      this.today = new Date()
    } else {
      this.today = today
    }
    this.issues = issues
    this.bugLabel = bugLabel
    if (releases === null || releases.length === 0) {
      throw new Error('Empty release list')
    }
    this.releases = [...releases].sort((a, b) => a.publishedAt - b.publishedAt)
  }

  getBugCount(): BugTime[] {
    const bugs: Issue[] = this.getIssuesTaggedAsBug()
    const values: BugTime[] = this.getStartAndEndTimesForBugs(bugs)

    return values
  }

  private getStartAndEndTimesForBugs(bugs: Issue[]): BugTime[] {
    const values: BugTime[] = []
    for (const bug of bugs) {
      if (
        bug.closedAt !== null &&
        this.hasLaterRelease(bug.closedAt, bug.repo) &&
        this.hasPreviousRelease(bug.createdAt, bug.repo)
      ) {
        values.push({
          start: bug.createdAt,
          end: bug.closedAt,
          repo: bug.repo
        })
      }
    }
    return values
  }

  private getIssuesTaggedAsBug(): Issue[] {
    const bugs: Issue[] = []
    for (const issue of this.issues) {
      if (
        issue.labels.includes(this.bugLabel) &&
        issue.createdAt > this.today.getTime() - 30 * ONE_DAY
      ) {
        bugs.push(issue)
      }
    }
    return bugs
  }

  hasPreviousRelease(date: number, repo: RepoKey): boolean {
    return this.releases.some(r => r.publishedAt < date && r.repo === repo)
  }

  getReleaseBefore(date: number, repo: RepoKey): Release {
    const releases = this.releases.filter(
      r => r.publishedAt < date && r.repo === repo
    )

    if (releases.length === 0) {
      throw new Error('No previous releases')
    }

    return releases.pop() as Release
  }

  getReleaseAfter(date: number, repo: RepoKey): Release {
    const releases = this.releases.filter(
      r => r.publishedAt > date && r.repo === repo
    )

    if (releases.length === 0) {
      throw new Error('No later releases')
    }

    return releases[0]
  }

  hasLaterRelease(date: number, repo: RepoKey): boolean {
    return this.releases.some(r => r.publishedAt > date && r.repo === repo)
  }

  getRestoreTime(bug: BugTime): number {
    const prevRel = this.getReleaseBefore(bug.start, bug.repo)
    const nextRel = this.getReleaseAfter(bug.end, bug.repo)

    return nextRel.publishedAt - prevRel.publishedAt
  }

  mttr(): number {
    const ttr: number[] = this.getBugCount().map(bug => {
      return this.getRestoreTime(bug)
    }, this)

    if (ttr.length === 0) {
      return 0
    }

    let sum = 0
    for (const ttrElement of ttr) {
      sum += ttrElement
    }

    return Math.round((sum / ttr.length / ONE_DAY) * 100) / 100 // Two decimals
  }
}
