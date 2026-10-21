import type {Release} from './types/Release'
import type {ReleaseLogEntry} from './types/LogEntry'
import {isoTimestamp} from './types/Timestamp'
import {inWindow} from './MetricsWindow'
import type {MetricOptions, MetricsWindow} from './MetricsWindow'

// The number of milliseconds in one day
const ONE_DAY = 1000 * 60 * 60 * 24

export class DeployFrequency {
  log: ReleaseLogEntry[] = []
  rList: Release[]
  private readonly window: MetricsWindow

  getLog(): ReleaseLogEntry[] {
    return this.log
  }

  constructor(releases: Release[], options: MetricOptions) {
    this.rList = releases
    this.window = options.window
  }

  // Releases published in the last seven days of the window.
  weekly(): number {
    return this.count({from: this.window.to - 7 * ONE_DAY, to: this.window.to})
  }

  monthly(): number {
    return this.count(this.window)
  }

  // Releases per week over the 30-day window, two decimals.
  rate(): string {
    return (Math.round(this.monthly() * 700) / 3000).toFixed(2)
  }

  private count(window: Pick<MetricsWindow, 'from' | 'to'>): number {
    let releaseCount = 0
    for (const release of this.rList) {
      if (inWindow(window, release.publishedAt)) {
        this.log.push(this.entry(release))
        releaseCount++
      }
    }
    return releaseCount
  }

  private entry(release: Release): ReleaseLogEntry {
    return {
      kind: 'release',
      repo: release.repo,
      at: isoTimestamp(release.publishedAt),
      name: release.name
    }
  }
}
