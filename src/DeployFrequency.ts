//

import type {Release} from './types/Release'
import {isoTimestamp} from './types/Timestamp'

// The number of milliseconds in one day
const ONE_DAY = 1000 * 60 * 60 * 24

export class DeployFrequency {
  log: string[] = []
  today: Date = new Date()
  rList: Release[] = new Array<Release>()

  getLog(): string[] {
    return this.log
  }

  constructor(releases: Release[] | null, dateString: string | null = null) {
    this.rList = releases as Release[]
    if (this.rList === null || this.rList.length === 0) {
      throw new Error('Empty release list')
    }

    if (dateString !== null) {
      this.today = new Date(dateString)
    }
  }

  weekly(): number {
    let releaseCount = 0
    for (const release of this.rList) {
      const relDate = new Date(release.publishedAt)
      if (this.days_between(this.today, relDate) < 8) {
        this.log.push(
          `release->  ${release.name}:${isoTimestamp(release.publishedAt)}`
        )
        releaseCount++
      }
    }

    return releaseCount
  }

  monthly(): number {
    let releaseCount = 0
    for (const release of this.rList) {
      const relDate = new Date(release.publishedAt)
      if (this.days_between(this.today, relDate) < 31) {
        this.log.push(
          `release->  ${release.name}:${isoTimestamp(release.publishedAt)}`
        )
        releaseCount++
      }
    }

    return releaseCount
  }

  rate(): string {
    return (Math.round(this.monthly() * 700) / 3000).toFixed(2)
  }

  private days_between(date1: Date, date2: Date): number {
    // Calculate the difference in milliseconds
    const differenceMs = Math.abs(date1.valueOf() - date2.valueOf())

    // Convert back to days and return
    return Math.round(differenceMs / ONE_DAY)
  }
}
