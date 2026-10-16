import type {Issue} from '../src/types/Issue'
import type {Release} from '../src/types/Release'
import type {RepoKey} from '../src/types/RepoKey'
import type {
  GitHubIssuePayload,
  GitHubReleasePayload
} from '../src/github/payloads'
import {toIssue, toRelease} from '../src/github/mappers'
import fs from 'node:fs'
import {ChangeFailureRate} from '../src/ChangeFailureRate'
import {issue, release, ts} from './helpers/domain'

const ONE_DAY = 24 * 60 * 60 * 1000
const DORA = 'stenjo/dora'
const REPOSITORY = 'somepath/repository'
const OTHER = 'somepath/other-repo'

const fixtureIssues = (): Issue[] =>
  (
    JSON.parse(
      fs.readFileSync('./__tests__/test-data/issue-list.json', 'utf8')
    ) as GitHubIssuePayload[]
  ).map(p => toIssue('stenjo', 'devops-metrics-action', p))
const fixtureReleases = (): Release[] =>
  (
    JSON.parse(
      fs.readFileSync('./__tests__/test-data/releases.json', 'utf8')
    ) as GitHubReleasePayload[]
  ).map(p => toRelease('stenjo', 'devops-metrics-action', p))

const bug = (createdAt: string, repo: RepoKey = REPOSITORY): Issue =>
  issue({repo, createdAt: ts(createdAt), closedAt: null})

describe('ChangeFailureRate should', () => {
  it('get number of bugs created', () => {
    const cfr = new ChangeFailureRate(
      fixtureIssues(),
      fixtureReleases(),
      new Date('2023-04-23T16:50:53Z')
    )

    const bugs = cfr.getBugs()

    expect(bugs.length).toBe(2)
  })

  it('get percentage rate', () => {
    const cfr = new ChangeFailureRate(
      fixtureIssues(),
      fixtureReleases(),
      new Date('2023-04-23T16:50:53Z')
    )

    const cfrPercentage = cfr.Cfr()

    expect(cfrPercentage).toBe(14)
  })

  it('calculate 0 failures on 0 releases', () => {
    const cfr = new ChangeFailureRate(
      fixtureIssues(),
      [],
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 0 failures on 0 issues', () => {
    const cfr = new ChangeFailureRate(
      [],
      fixtureReleases(),
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 100% failures on 1 issues on 1 release', () => {
    const bugs = [bug('2023-04-30T17:50:53Z', DORA)]
    const releases = [release('2023-04-30T16:50:53Z', DORA)]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(100)
    expect(cfr.repos).toEqual([DORA])
  })

  describe('boundaries', () => {
    const today = new Date('2023-05-01T00:00:00Z')
    const doraBug = (createdAt: string, repo: RepoKey = DORA): Issue =>
      bug(createdAt, repo)
    const doraRelease = (publishedAt: string, repo: RepoKey = DORA): Release =>
      release(publishedAt, repo)

    it('exclude releases published exactly 31 days ago', () => {
      const onBoundary = new ChangeFailureRate(
        [doraBug('2023-04-15T00:00:00Z')],
        [doraRelease('2023-03-31T00:00:00Z')],
        today
      )
      const inside = new ChangeFailureRate(
        [doraBug('2023-04-15T00:00:00Z')],
        [doraRelease('2023-03-31T00:00:01Z')],
        today
      )

      expect(onBoundary.Cfr()).toBe(0)
      expect(inside.Cfr()).toBe(100)
    })

    it('not count a bug created at the exact release time', () => {
      const releases = [
        doraRelease('2023-04-10T00:00:00Z'),
        doraRelease('2023-04-20T00:00:00Z')
      ]
      const atFirst = new ChangeFailureRate(
        [doraBug('2023-04-10T00:00:00Z')],
        [...releases],
        today
      )
      const atSecond = new ChangeFailureRate(
        [doraBug('2023-04-20T00:00:00Z')],
        [...releases],
        today
      )

      expect(atFirst.Cfr()).toBe(0)
      expect(atSecond.Cfr()).toBe(0)
    })

    it('sort releases by date before pairing them', () => {
      const releases = [
        doraRelease('2023-04-10T00:00:00Z'),
        doraRelease('2023-04-20T00:00:00Z'),
        doraRelease('2023-04-30T00:00:00Z')
      ]
      const cfr = new ChangeFailureRate(
        [doraBug('2023-04-15T00:00:00Z'), doraBug('2023-04-25T00:00:00Z')],
        releases,
        today
      )

      expect(cfr.Cfr()).toBe(67)
    })

    it('not attribute bugs from another repo to this repo releases', () => {
      const other = 'stenjo/other'
      const releases = [
        doraRelease('2023-04-10T00:00:00Z'),
        doraRelease('2023-04-20T00:00:00Z'),
        doraRelease('2023-04-12T00:00:00Z', other)
      ]
      const cfr = new ChangeFailureRate(
        [
          doraBug('2023-04-25T00:00:00Z'),
          doraBug('2023-04-15T00:00:00Z', other)
        ],
        releases,
        today
      )

      expect(cfr.Cfr()).toBe(67)
    })

    it('not attribute bugs of a repo whose name is a prefix of another', () => {
      // api: one release followed by two bugs -> 1 failed deploy of 3.
      // Prefix matching on "api" would also pair the bugs with the two
      // api-gateway releases and count 2 failed deploys (67%).
      const releases = [
        doraRelease('2023-04-10T00:00:00Z', 'o/api'),
        doraRelease('2023-04-12T00:00:00Z', 'o/api-gateway'),
        doraRelease('2023-04-20T00:00:00Z', 'o/api-gateway')
      ]
      const cfr = new ChangeFailureRate(
        [
          doraBug('2023-04-11T00:00:00Z', 'o/api'),
          doraBug('2023-04-15T00:00:00Z', 'o/api')
        ],
        releases,
        today
      )

      expect(cfr.Cfr()).toBe(33)
      expect(cfr.repos).toEqual(['o/api'])
    })

    it('ignore bugs created in the future without failing', () => {
      const now = Date.now()
      const cfr = new ChangeFailureRate(
        [doraBug(new Date(now + ONE_DAY).toISOString())],
        [doraRelease(new Date(now - ONE_DAY).toISOString())]
      )

      expect(cfr.Cfr()).toBe(0)
    })
  })

  describe('log', () => {
    const today = new Date('2023-05-01T00:00:00Z')

    it('be empty before Cfr() runs and when nothing failed', () => {
      const cfr = new ChangeFailureRate(
        [bug('2023-04-05T00:00:00Z', DORA)],
        [release('2023-04-10T00:00:00Z', DORA, 'v1')],
        today
      )

      expect(cfr.getLog()).toEqual([])
      expect(cfr.Cfr()).toBe(0)
      expect(cfr.getLog()).toEqual([])
    })

    it('record one failed-release per counted interval with its bugs', () => {
      const releases = [
        release('2023-04-30T00:00:00Z', DORA, 'v3'),
        release('2023-04-10T00:00:00Z', DORA, 'v1'),
        release('2023-04-20T00:00:00Z', DORA, 'v2')
      ]
      const bugs = [
        issue({
          repo: DORA,
          number: 7,
          title: 'bug: crash',
          createdAt: ts('2023-04-25T00:00:00Z'),
          closedAt: null
        }),
        issue({
          repo: DORA,
          number: 5,
          title: 'bug: slow',
          createdAt: ts('2023-04-12T00:00:00Z'),
          closedAt: null
        }),
        issue({
          repo: DORA,
          number: 6,
          title: 'bug: wrong',
          createdAt: ts('2023-04-15T00:00:00Z'),
          closedAt: null
        })
      ]
      const cfr = new ChangeFailureRate(bugs, releases, today)

      expect(cfr.Cfr()).toBe(67)
      expect(cfr.getLog()).toEqual([
        {
          kind: 'failed-release',
          at: '2023-04-10T00:00:00Z',
          name: 'v1',
          bugs: [
            {number: 5, title: 'bug: slow', createdAt: '2023-04-12T00:00:00Z'},
            {number: 6, title: 'bug: wrong', createdAt: '2023-04-15T00:00:00Z'}
          ]
        },
        {
          kind: 'failed-release',
          at: '2023-04-20T00:00:00Z',
          name: 'v2',
          bugs: [
            {number: 7, title: 'bug: crash', createdAt: '2023-04-25T00:00:00Z'}
          ]
        }
      ])
    })

    it('attribute a bug after the latest release to that release', () => {
      const cfr = new ChangeFailureRate(
        [bug('2023-04-30T17:50:53Z', DORA)],
        [release('2023-04-30T16:50:53Z', DORA, 'v9')],
        today
      )

      expect(cfr.Cfr()).toBe(100)
      expect(cfr.getLog()).toHaveLength(1)
      expect(cfr.getLog()[0]).toMatchObject({
        at: '2023-04-30T16:50:53Z',
        name: 'v9'
      })
    })

    it('keep one record per repo interval and the count equal to failed deploys', () => {
      const other = 'stenjo/other'
      const releases = [
        release('2023-04-10T00:00:00Z', DORA, 'd1'),
        release('2023-04-20T00:00:00Z', DORA, 'd2'),
        release('2023-04-12T00:00:00Z', other, 'o1')
      ]
      const cfr = new ChangeFailureRate(
        [bug('2023-04-25T00:00:00Z', DORA), bug('2023-04-15T00:00:00Z', other)],
        releases,
        today
      )

      expect(cfr.Cfr()).toBe(67)
      expect(cfr.getLog().map(e => `${e.name}@${e.at}`)).toEqual([
        'd2@2023-04-20T00:00:00Z',
        'o1@2023-04-12T00:00:00Z'
      ])
    })

    it('match the fixture rate: failed intervals over releases in window', () => {
      const cfr = new ChangeFailureRate(
        fixtureIssues(),
        fixtureReleases(),
        new Date('2023-04-23T16:50:53Z')
      )

      expect(cfr.Cfr()).toBe(14)
      expect(cfr.getLog()).toHaveLength(1)
      expect(
        Math.round((cfr.getLog().length / cfr.releases.length) * 100)
      ).toBe(14)
      expect(cfr.getLog()[0].kind).toBe('failed-release')
      expect(cfr.getLog()[0].bugs).toHaveLength(2)
    })
  })

  it('calculate 0% failures on 1 issues on 1 release when more than a month ago', () => {
    const bugs = [bug('2023-04-30T17:50:53Z', DORA)]
    const releases = [release('2023-04-30T16:50:53Z', DORA)]

    const cfr = new ChangeFailureRate(bugs, releases)

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 0% failures on 1 issues on release on other repo', () => {
    const bugs = [bug('2023-04-30T17:50:53Z', DORA)]
    const releases = [release('2023-04-30T16:50:53Z', 'stenjo/other-repo')]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 50% failures on 1 issues on 2 releases', () => {
    const bugs = [bug('2023-04-30T17:50:53Z')]
    const releases = [
      release('2023-04-30T16:50:53Z', REPOSITORY),
      release('2023-04-29T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  it('calculate 0% failures on 1 issues that is not a bug on 2 releases', () => {
    const bugs = [{...bug('2023-04-30T17:50:53Z'), labels: ['feature']}]
    const releases = [
      release('2023-04-30T16:50:53Z', REPOSITORY),
      release('2023-04-29T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 50% failures on 2 issues after latest release', () => {
    const bugs = [bug('2023-04-30T17:50:53Z'), bug('2023-04-30T17:50:53Z')]
    const releases = [
      release('2023-04-30T16:50:53Z', REPOSITORY),
      release('2023-04-29T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  it('calculate 100% failures on 2 issues after no releases this month', () => {
    const bugs = [bug('2023-04-29T17:50:53Z'), bug('2023-05-01T17:50:53Z')]
    const releases = [
      release('2023-04-30T16:50:53Z', REPOSITORY),
      release('2023-04-29T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-05-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(100)
  })

  it('calculate 100% failures on 2 issues after latest release and one before', () => {
    const bugs = [
      bug('2023-04-29T17:50:53Z'),
      bug('2023-04-30T17:50:53Z'),
      bug('2023-04-30T17:50:53Z')
    ]
    const releases = [
      release('2023-04-30T16:50:53Z', REPOSITORY),
      release('2023-04-29T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(100)
  })

  it('calculate 33% failures on 3 issues after first release and none after second of 3 releases', () => {
    const bugs = [
      bug('2023-04-29T17:50:53Z'),
      bug('2023-04-30T17:50:53Z'),
      bug('2023-04-30T17:50:53Z')
    ]
    const releases = [
      release('2023-04-28T16:50:53Z', REPOSITORY),
      release('2023-04-30T19:50:53Z', REPOSITORY),
      release('2023-05-02T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(33)
  })

  it('calculate 50% failures on 3 issues on two repos on two of 4 releases', () => {
    const bugs = [
      bug('2023-04-29T17:50:53Z'), // bug on 28, repository
      bug('2023-04-30T17:50:53Z', OTHER), // bug on 28, other-repo
      bug('2023-04-30T17:50:53Z') // bug on 28, repository
    ]
    const releases = [
      release('2023-04-28T16:50:53Z', REPOSITORY),
      release('2023-04-28T16:50:53Z', OTHER),
      release('2023-04-30T19:50:53Z', REPOSITORY),
      release('2023-05-02T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  it('calculate 50% failures on 3 issues after first release no older than a month', () => {
    const bugs = [
      bug('2023-04-29T17:50:53Z'),
      bug('2023-04-30T17:50:53Z'),
      bug('2023-04-30T17:50:53Z')
    ]
    const releases = [
      release('2023-04-28T16:50:53Z', REPOSITORY),
      release('2023-04-30T19:50:53Z', REPOSITORY),
      release('2023-04-02T16:50:53Z', REPOSITORY)
    ]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-05-29T10:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  describe('with a custom bug label', () => {
    const releases = [release('2023-04-30T16:50:53Z', DORA)]
    const today = new Date('2023-04-30T17:50:53Z')

    const issuesLabelled = (label: string): Issue[] => [
      {...bug('2023-04-30T17:50:53Z', DORA), labels: [label]}
    ]

    it('count issues tagged with the custom label', () => {
      const cfr = new ChangeFailureRate(
        issuesLabelled('incident'),
        releases,
        today,
        'incident'
      )

      expect(cfr.getBugs().length).toBe(1)
      expect(cfr.Cfr()).toBe(100)
    })

    it('ignore issues tagged bug when a custom label is given', () => {
      const cfr = new ChangeFailureRate(
        issuesLabelled('bug'),
        releases,
        today,
        'incident'
      )

      expect(cfr.getBugs().length).toBe(0)
      expect(cfr.Cfr()).toBe(0)
    })

    it('default to the bug label when none is given', () => {
      const cfrDefault = new ChangeFailureRate(
        issuesLabelled('bug'),
        releases,
        today
      )
      const cfrIncident = new ChangeFailureRate(
        issuesLabelled('incident'),
        releases,
        today
      )

      expect(cfrDefault.getBugs().length).toBe(1)
      expect(cfrIncident.getBugs().length).toBe(0)
    })
  })
})
