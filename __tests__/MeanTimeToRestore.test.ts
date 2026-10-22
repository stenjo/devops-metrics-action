import type {Issue} from '../src/types/Issue'
import type {Release} from '../src/types/Release'
import type {
  GitHubIssuePayload,
  GitHubReleasePayload
} from '../src/github/payloads'
import {toIssue, toRelease} from '../src/github/mappers'
import fs from 'node:fs'
import {type BugTime, MeanTimeToRestore} from '../src/MeanTimeToRestore'
import {issue, release, ts, windowAt} from './helpers/domain'

const DMA = 'stenjo/devops-metrics-action'
const REPOSITORY = 'some-path/repository'
const OTHER = 'some-path/other-repo'

describe('MeanTimeToRestore should', () => {
  const issues: Issue[] = (
    JSON.parse(
      fs.readFileSync('./__tests__/test-data/issue-list.json').toString()
    ) as GitHubIssuePayload[]
  ).map(p => toIssue('stenjo', 'devops-metrics-action', p))
  const releases: Release[] = (
    JSON.parse(
      fs.readFileSync('./__tests__/test-data/releases.json').toString()
    ) as GitHubReleasePayload[]
  ).map(p => toRelease('stenjo', 'devops-metrics-action', p))
  const mttr = new MeanTimeToRestore(issues, releases, {
    window: windowAt('2023-04-30T16:50:53Z')
  })

  it('get bugs last month', () => {
    const bugCount = mttr.getBugCount()

    expect(bugCount.length).toBe(2)
    expect(bugCount[0].start).toBe(ts('2023-04-25T21:21:49Z'))
    expect(bugCount[1].end).toBe(ts('2023-04-23T16:47:40Z'))
    expect(bugCount.map(b => b.issue.number)).toEqual([26, 16])
  })

  describe('restore log', () => {
    it('log one restore record per contributing bug with the bounding releases', () => {
      const m = new MeanTimeToRestore(issues, releases, {
        window: windowAt('2023-04-30T16:50:53Z')
      })

      expect(m.getLog()).toEqual([])
      const mean = m.mttr()

      expect(m.getLog()).toEqual([
        {
          kind: 'restore',
          repo: 'stenjo/devops-metrics-action',
          number: 26,
          title: 'fix: include also closed issues in issue list',
          createdAt: '2023-04-25T21:21:49Z',
          closedAt: '2023-04-29T12:54:45Z',
          releaseBefore: 'v0.0.2',
          releaseBeforeAt: '2023-04-22T20:28:29Z',
          releaseAfter: 'v0.2.0',
          releaseAfterAt: '2023-04-30T16:06:06Z',
          restoreDays: 7.82
        },
        {
          kind: 'restore',
          repo: 'stenjo/devops-metrics-action',
          number: 16,
          title: 'Add test json data to project',
          createdAt: '2023-04-22T21:44:06Z',
          closedAt: '2023-04-23T16:47:40Z',
          releaseBefore: 'v0.0.2',
          releaseBeforeAt: '2023-04-22T20:28:29Z',
          releaseAfter: 'v0.1.0',
          releaseAfterAt: '2023-04-29T06:18:36Z',
          restoreDays: 6.41
        }
      ])
      expect(m.getLog().length).toBe(m.getBugCount().length)
      // Each restoreDays is rounded, so their mean may differ from mttr() by rounding noise only.
      const days = m.getLog().map(e => e.restoreDays)
      const meanOfRounded = days.reduce((a, b) => a + b) / days.length
      expect(Math.abs(meanOfRounded - mean)).toBeLessThanOrEqual(0.005)
      expect(mean).toBe(7.11)
    })

    it('skip open bugs and bugs without a bracketing release', () => {
      const bugs = [
        issue({
          number: 1,
          repo: REPOSITORY,
          createdAt: ts('2023-04-22T21:44:06Z'),
          closedAt: null
        }),
        issue({
          number: 2,
          repo: REPOSITORY,
          createdAt: ts('2023-04-19T00:00:00Z'), // before the first release
          closedAt: ts('2023-04-23T00:00:00Z')
        }),
        issue({
          number: 3,
          repo: REPOSITORY,
          createdAt: ts('2023-04-25T00:00:00Z'),
          closedAt: ts('2023-04-26T00:00:00Z') // no release after
        }),
        issue({
          number: 4,
          repo: REPOSITORY,
          createdAt: ts('2023-04-21T00:00:00Z'),
          closedAt: ts('2023-04-23T00:00:00Z')
        })
      ]
      const localReleases = [
        release('2023-04-20T00:00:00Z', REPOSITORY, 'early'),
        release('2023-04-24T00:00:00Z', REPOSITORY, 'late')
      ]
      const m = new MeanTimeToRestore(bugs, localReleases, {
        window: windowAt('2023-04-30T00:00:00Z')
      })

      expect(m.mttr()).toBe(4)
      expect(m.getLog().map(e => e.number)).toEqual([4])
      expect(m.getLog()[0]).toMatchObject({
        releaseBefore: 'early',
        releaseAfter: 'late',
        restoreDays: 4
      })
    })

    it('leave the log empty when no bug contributes', () => {
      const m = new MeanTimeToRestore([], releases, {window: windowAt()})

      expect(m.mttr()).toBe(0)
      expect(m.getLog()).toEqual([])
    })
  })

  it('find release time before date', () => {
    const before1 = mttr.getReleaseBefore(ts('2023-04-25T21:21:49Z'), DMA)
    const before2 = mttr.getReleaseBefore(ts('2023-04-29T12:54:45Z'), DMA)

    expect(before1.publishedAt).toBe(ts('2023-04-22T20:28:29Z'))
    expect(before2.publishedAt).toBe(ts('2023-04-29T06:18:36Z'))
  })

  it('throw error when no earlier dates', () => {
    const t = (): void => {
      mttr.getReleaseBefore(ts('2023-04-05T21:21:49Z'), DMA)
    }

    expect(t).toThrow('No previous releases')
  })

  it('find release time after date', () => {
    const after1 = mttr.getReleaseAfter(ts('2023-04-25T21:21:49Z'), DMA)
    const after2 = mttr.getReleaseAfter(ts('2023-04-29T12:54:45Z'), DMA)

    expect(after1.publishedAt).toBe(ts('2023-04-29T06:18:36Z'))
    expect(after2.publishedAt).toBe(ts('2023-04-30T16:06:06Z'))
  })

  it('throw error when no later dates', () => {
    const t = (): void => {
      mttr.getReleaseAfter(ts('2023-05-05T21:21:49Z'), DMA)
    }

    expect(t).toThrow('No later releases')
  })

  it('check if there are later releases', () => {
    const hasLaterRelease = mttr.hasLaterRelease(
      ts('2023-04-29T12:54:45Z'),
      DMA
    )
    const hasNoLaterRelease = mttr.hasLaterRelease(
      ts('2023-04-30T17:29:44Z'),
      DMA
    )

    expect(hasLaterRelease).toBe(true)
    expect(hasNoLaterRelease).toBe(false)
  })

  it('get time for a bug 1', () => {
    const bug: BugTime = {
      start: ts('2023-04-22T21:44:06Z'),
      end: ts('2023-04-23T16:47:40Z'),
      repo: DMA,
      issue: issue()
    }
    const releaseDiff = ts('2023-04-29T06:18:36Z') - ts('2023-04-22T20:28:29Z')

    const fixTime: number = mttr.getRestoreTime(bug)

    expect(fixTime).toBe(releaseDiff)
  })
  it('get time for a bug 2', () => {
    const bug: BugTime = {
      start: ts('2023-04-25T21:21:49Z'),
      end: ts('2023-04-29T12:54:45Z'),
      repo: DMA,
      issue: issue()
    }
    const releaseDiff = ts('2023-04-30T16:06:06Z') - ts('2023-04-22T20:28:29Z')

    const fixTime: number = mttr.getRestoreTime(bug)

    expect(fixTime).toBe(releaseDiff)
  })

  const twoBugs = (): Issue[] => [
    issue({
      repo: REPOSITORY,
      createdAt: ts('2023-04-22T21:44:06Z'),
      closedAt: ts('2023-04-23T16:47:40Z')
    }),
    issue({
      repo: REPOSITORY,
      createdAt: ts('2023-04-25T21:21:49Z'),
      closedAt: ts('2023-04-29T12:54:45Z')
    })
  ]

  it('get mttr for bug 1 when no release after bug 2', () => {
    const localReleases = [
      release('2023-04-25T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-20T00:00:00Z', REPOSITORY)
    ]

    const mttrEmpty = new MeanTimeToRestore(twoBugs(), localReleases, {
      window: windowAt('2023-04-29T12:54:45Z')
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4)
  })

  it('returns 0 when both the issue and release lists are empty', () => {
    const m = new MeanTimeToRestore([] as Issue[], [] as Release[], {
      window: windowAt()
    })

    expect(m.mttr()).toBe(0)
    expect(m.getLog()).toEqual([])
  })

  it('get mttr for bug 1 when release in wrong repo after bug 2', () => {
    const localReleases = [
      release('2023-04-25T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-30T00:00:00Z', OTHER),
      release('2023-04-20T00:00:00Z', REPOSITORY)
    ]

    const mttrEmpty = new MeanTimeToRestore(twoBugs(), localReleases, {
      window: windowAt('2023-04-30T00:00:00Z')
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4)
  })

  it('get mttr for 2 bugs when release after bug 2', () => {
    const localReleases = [
      release('2023-04-30T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-20T00:00:00Z', REPOSITORY)
    ]

    const mttrEmpty = new MeanTimeToRestore(twoBugs(), localReleases, {
      window: windowAt('2023-04-30T00:00:00Z')
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(5)
  })

  it('get mttr for 2 bugs on two repos when release after bug 2', () => {
    const bugList: Issue[] = [
      issue({
        // 21 -> 24 = 3
        repo: OTHER,
        createdAt: ts('2023-04-22T21:44:06Z'),
        closedAt: ts('2023-04-23T16:47:40Z')
      }),
      issue({
        // 24 -> 30 = 6
        repo: REPOSITORY,
        createdAt: ts('2023-04-25T21:21:49Z'),
        closedAt: ts('2023-04-29T12:54:45Z')
      })
    ]
    const localReleases = [
      release('2023-04-30T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-20T00:00:00Z', REPOSITORY),
      release('2023-04-21T00:00:00Z', OTHER),
      release('2023-04-24T00:00:00Z', OTHER)
    ]

    const mttrEmpty = new MeanTimeToRestore(bugList, localReleases, {
      window: windowAt('2023-04-30T00:00:00Z')
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4.5)
  })

  it('get mttr for 2 bugs on two repos when no release after bug 1', () => {
    const bugList: Issue[] = [
      issue({
        repo: OTHER,
        createdAt: ts('2023-04-22T21:44:06Z'),
        closedAt: ts('2023-04-23T16:47:40Z')
      }),
      issue({
        // 24 -> 30 = 6
        repo: REPOSITORY,
        createdAt: ts('2023-04-25T21:21:49Z'),
        closedAt: ts('2023-04-29T12:54:45Z')
      })
    ]
    const localReleases = [
      release('2023-04-30T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-20T00:00:00Z', REPOSITORY),
      release('2023-04-21T00:00:00Z', OTHER)
    ]

    const mttrEmpty = new MeanTimeToRestore(bugList, localReleases, {
      window: windowAt('2023-04-30T00:00:00Z')
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(6)
  })

  it('not attribute releases of a repo whose name is a prefix of another', () => {
    const bug = issue({
      repo: 'o/api',
      createdAt: ts('2023-04-25T00:00:00Z'),
      closedAt: ts('2023-04-26T00:00:00Z')
    })
    const gatewayOnly = [
      release('2023-04-20T00:00:00Z', 'o/api-gateway'),
      release('2023-04-28T00:00:00Z', 'o/api-gateway')
    ]
    const both = [
      ...gatewayOnly,
      release('2023-04-22T00:00:00Z', 'o/api'),
      release('2023-04-30T00:00:00Z', 'o/api')
    ]
    const today = new Date('2023-05-01T00:00:00Z')

    expect(
      new MeanTimeToRestore([bug], gatewayOnly, {
        window: windowAt(today)
      }).mttr()
    ).toBe(0)
    expect(
      new MeanTimeToRestore([bug], both, {window: windowAt(today)}).mttr()
    ).toBe(8) // 22/4 -> 30/4
  })

  it('get average time to repair', () => {
    const avMttr: number = mttr.mttr()

    expect(avMttr).toBe(7.11)
  })

  it('returns 0 when there are bugs but no releases', () => {
    const emptyReleaseList: Release[] = []

    const m = new MeanTimeToRestore(issues, emptyReleaseList, {
      window: windowAt()
    })

    expect(m.getBugCount()).toEqual([])
    expect(m.mttr()).toBe(0)
    expect(m.getLog()).toEqual([])
  })

  it('return 0 when no bugs', () => {
    const emptyBugList: Issue[] = []

    const mttrEmpty = new MeanTimeToRestore(emptyBugList, releases, {
      window: windowAt()
    })
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(0)
  })

  it('not mutate the release list passed in', () => {
    const input = [
      release('2023-04-30T00:00:00Z', REPOSITORY, 'late'),
      release('2023-04-20T00:00:00Z', REPOSITORY, 'early')
    ]

    const m = new MeanTimeToRestore([], input, {window: windowAt()})

    expect(input.map(r => r.name)).toEqual(['late', 'early'])
    expect(m.releases.map(r => r.name)).toEqual(['early', 'late'])
  })

  describe('release boundaries', () => {
    const first = ts('2023-04-12T22:33:24Z')
    const second = ts('2023-04-22T20:28:29Z')
    const third = ts('2023-04-29T06:18:36Z')
    const last = ts('2023-04-30T17:29:44Z')

    it('not count a release published at the exact date as previous', () => {
      expect(mttr.hasPreviousRelease(first, DMA)).toBe(false)
      expect(mttr.hasPreviousRelease(first + 1, DMA)).toBe(true)
    })

    it('not count releases of other repos as previous', () => {
      expect(mttr.hasPreviousRelease(last + 1, 'stenjo/unknown-repo')).toBe(
        false
      )
    })

    it('skip a closer release of another repo in getReleaseBefore and getReleaseAfter', () => {
      const m = new MeanTimeToRestore(
        [],
        [
          release('2023-04-10T00:00:00Z', 'o/api', 'api-before'),
          release('2023-04-14T00:00:00Z', 'o/api-gateway', 'gw-before'),
          release('2023-04-16T00:00:00Z', 'o/api-gateway', 'gw-after'),
          release('2023-04-20T00:00:00Z', 'o/api', 'api-after')
        ],
        {window: windowAt()}
      )
      const date = ts('2023-04-15T00:00:00Z')

      expect(m.getReleaseBefore(date, 'o/api').name).toBe('api-before')
      expect(m.getReleaseAfter(date, 'o/api').name).toBe('api-after')
    })

    it('not count a release published at the exact date as later', () => {
      expect(mttr.hasLaterRelease(last, DMA)).toBe(false)
      expect(mttr.hasLaterRelease(last - 1, DMA)).toBe(true)
    })

    it('skip the release published at the exact date in getReleaseBefore', () => {
      expect(mttr.getReleaseBefore(second, DMA).publishedAt).toBe(first)
      expect(mttr.getReleaseBefore(second + 1, DMA).publishedAt).toBe(second)
    })

    it('skip the release published at the exact date in getReleaseAfter', () => {
      expect(mttr.getReleaseAfter(second, DMA).publishedAt).toBe(third)
      expect(mttr.getReleaseAfter(second - 1, DMA).publishedAt).toBe(second)
    })
  })

  describe('bug selection', () => {
    const DORA = 'stenjo/dora'
    const localReleases = [
      release('2023-03-25T00:00:00Z', DORA),
      release('2023-04-30T00:00:00Z', DORA)
    ]
    const today = new Date('2023-05-01T00:00:00Z')

    it('ignore bugs that are still open', () => {
      const bugs = [
        issue({
          repo: DORA,
          createdAt: ts('2023-04-10T00:00:00Z'),
          closedAt: null
        })
      ]
      const m = new MeanTimeToRestore(bugs, localReleases, {
        window: windowAt(today)
      })

      expect(m.getBugCount()).toEqual([])
      expect(m.mttr()).toBe(0)
    })

    it('include a bug created exactly 30 days ago and ignore older ones', () => {
      const bug = issue({repo: DORA, closedAt: ts('2023-04-20T00:00:00Z')})
      const onBoundary = new MeanTimeToRestore(
        [{...bug, createdAt: ts('2023-04-01T00:00:00Z')}],
        localReleases,
        {window: windowAt(today)}
      )
      const justBefore = new MeanTimeToRestore(
        [{...bug, createdAt: ts('2023-03-31T23:59:59.999Z')}],
        localReleases,
        {window: windowAt(today)}
      )
      const older = new MeanTimeToRestore(
        [{...bug, createdAt: ts('2023-03-28T00:00:00Z')}],
        localReleases,
        {window: windowAt(today)}
      )

      expect(onBoundary.getBugCount().length).toBe(1)
      expect(justBefore.getBugCount()).toEqual([])
      expect(older.getBugCount()).toEqual([])
    })
  })

  describe('with a custom bug label', () => {
    const localReleases = [
      release('2023-04-30T00:00:00Z', REPOSITORY),
      release('2023-04-24T00:00:00Z', REPOSITORY),
      release('2023-04-20T00:00:00Z', REPOSITORY)
    ]
    const today = new Date('2023-04-30T00:00:00Z')

    const issuesLabelled = (label: string): Issue[] =>
      twoBugs().map(b => ({...b, labels: [label]}))

    it('count issues tagged with the custom label', () => {
      const mttrCustom = new MeanTimeToRestore(
        issuesLabelled('incident'),
        localReleases,
        {window: windowAt(today), bugLabel: 'incident'}
      )

      expect(mttrCustom.getBugCount().length).toBe(2)
      expect(mttrCustom.mttr()).toBe(5)
    })

    it('ignore issues tagged bug when a custom label is given', () => {
      const mttrCustom = new MeanTimeToRestore(
        issuesLabelled('bug'),
        localReleases,
        {window: windowAt(today), bugLabel: 'incident'}
      )

      expect(mttrCustom.getBugCount().length).toBe(0)
      expect(mttrCustom.mttr()).toBe(0)
    })

    it('default to the bug label when none is given', () => {
      const mttrDefault = new MeanTimeToRestore(
        issuesLabelled('bug'),
        localReleases,
        {window: windowAt(today)}
      )
      const mttrIncident = new MeanTimeToRestore(
        issuesLabelled('incident'),
        localReleases,
        {window: windowAt(today)}
      )

      expect(mttrDefault.getBugCount().length).toBe(2)
      expect(mttrIncident.getBugCount().length).toBe(0)
    })
  })
})
