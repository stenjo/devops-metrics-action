// Every metric applies the same window predicate (from <= t < to) to the event
// that selects its records. This table pins that contract for all four.
import {DeployFrequency} from '../src/DeployFrequency'
import {LeadTime} from '../src/LeadTime'
import {ChangeFailureRate} from '../src/ChangeFailureRate'
import {MeanTimeToRestore} from '../src/MeanTimeToRestore'
import type {MetricsWindow} from '../src/MetricsWindow'
import type {ICommitsAdapter} from '../src/interfaces/ICommitsAdapter'
import {commit, issue, pull, release, windowAt} from './helpers/domain'

const REPO = 'o/r'
const ONE_DAY = 24 * 60 * 60 * 1000
const WINDOW = windowAt('2024-03-01T12:00:00Z')

const iso = (ms: number): string => new Date(ms).toISOString()

const commits: ICommitsAdapter = {
  getCommits: async () => Promise.resolve([commit(iso(WINDOW.fetchFrom))])
}

// Each entry builds the metric with its selecting event at `at` and returns
// how many records that event produced (1 = included, 0 = excluded).
const metrics: {
  name: string
  event: string
  count: (window: MetricsWindow, at: number) => Promise<number>
}[] = [
  {
    name: 'DeployFrequency',
    event: 'release publishedAt',
    count: async (window, at) =>
      Promise.resolve(
        new DeployFrequency([release(iso(at), REPO)], {window}).monthly()
      )
  },
  {
    name: 'LeadTime',
    event: 'pull mergedAt',
    count: async (window, at) => {
      const lt = new LeadTime(
        [pull({repo: REPO, mergedAt: at})],
        [release(iso(at + ONE_DAY), REPO)],
        commits,
        {window}
      )
      await lt.getLeadTime()
      return lt.getLog().length
    }
  },
  {
    name: 'ChangeFailureRate',
    event: 'release publishedAt',
    count: async (window, at) =>
      Promise.resolve(
        new ChangeFailureRate(
          [issue({repo: REPO, createdAt: at + 1, closedAt: null})],
          [release(iso(at), REPO)],
          {window}
        ).releases.length
      )
  },
  {
    name: 'MeanTimeToRestore',
    event: 'bug createdAt',
    count: async (window, at) =>
      Promise.resolve(
        new MeanTimeToRestore(
          [issue({repo: REPO, createdAt: at, closedAt: at + 1})],
          [release(iso(at - 1), REPO), release(iso(at + 2), REPO)],
          {window}
        ).getBugCount().length
      )
  }
]

describe.each(metrics)('$name window boundaries ($event)', ({count}) => {
  it('includes an event exactly at from', async () => {
    expect(await count(WINDOW, WINDOW.from)).toBe(1)
  })

  it('excludes an event 1 ms before from', async () => {
    expect(await count(WINDOW, WINDOW.from - 1)).toBe(0)
  })

  it('includes an event 1 ms before to', async () => {
    expect(await count(WINDOW, WINDOW.to - 1)).toBe(1)
  })

  it('excludes an event exactly at to', async () => {
    expect(await count(WINDOW, WINDOW.to)).toBe(0)
  })
})
