import { Issue } from '../src/types/Issue'
import { Release } from '../src/types/Release'
import fs from 'fs'
import {
  BugTime,
  ReleaseDate,
  MeanTimeToRestore
} from '../src/MeanTimeToRestore'

describe('MeanTimeToRestore should', () => {
  const issues: Issue[] = JSON.parse(
    fs.readFileSync('./__tests__/test-data/issue-list.json').toString()
  )
  const releases: Release[] = JSON.parse(
    fs.readFileSync('./__tests__/test-data/releases.json').toString()
  )
  const mttr = new MeanTimeToRestore(
    issues,
    releases,
    new Date('2023-04-30T16:50:53Z')
  )

  it('get bugs last month', () => {
    const bugCount = mttr.getBugCount()

    expect(bugCount.length).toBe(2)
    expect(bugCount[0].start).toBe(+new Date('2023-04-25T21:21:49Z'))
    expect(bugCount[1].end).toBe(+new Date('2023-04-23T16:47:40Z'))
  })

  it('find release time before date', () => {
    const before1: ReleaseDate = mttr.getReleaseBefore(
      +new Date('2023-04-25T21:21:49Z'),
      'devops-metrics-action'
    )
    const before2: ReleaseDate = mttr.getReleaseBefore(
      +new Date('2023-04-29T12:54:45Z'),
      'devops-metrics-action'
    )

    expect(before1.published).toBe(+new Date('2023-04-22T20:28:29Z'))
    expect(before2.published).toBe(+new Date('2023-04-29T06:18:36Z'))
  })

  it('throw error when no earlier dates', () => {
    const t = (): void => {
      mttr.getReleaseBefore(
        +new Date('2023-04-05T21:21:49Z'),
        'devops-metrics-action'
      )
    }

    expect(t).toThrow('No previous releases')
  })

  it('find release time after date', () => {
    const after1: ReleaseDate = mttr.getReleaseAfter(
      +new Date('2023-04-25T21:21:49Z'),
      'devops-metrics-action'
    )
    const after2: ReleaseDate = mttr.getReleaseAfter(
      +new Date('2023-04-29T12:54:45Z'),
      'devops-metrics-action'
    )

    expect(after1.published).toBe(+new Date('2023-04-29T06:18:36Z'))
    expect(after2.published).toBe(+new Date('2023-04-30T16:06:06Z'))
  })

  it('throw error when no later dates', () => {
    const t = (): void => {
      mttr.getReleaseAfter(
        +new Date('2023-05-05T21:21:49Z'),
        'devops-metrics-action'
      )
    }

    expect(t).toThrow('No later releases')
  })

  it('check if there are later releases', () => {
    const hasLaterRelease: boolean = mttr.hasLaterRelease(
      +new Date('2023-04-29T12:54:45Z'),
      'devops-metrics-action'
    )
    const hasNoLaterRelease: boolean = mttr.hasLaterRelease(
      +new Date('2023-04-30T17:29:44Z'),
      'devops-metrics-action'
    )

    expect(hasLaterRelease).toBe(true)
    expect(hasNoLaterRelease).toBe(false)
  })

  it('get time for a bug 1', () => {
    const bug: BugTime = {
      start: +new Date('2023-04-22T21:44:06Z'),
      end: +new Date('2023-04-23T16:47:40Z'),
      repo: 'devops-metrics-action'
    }
    const releaseDiff =
      +new Date('2023-04-29T06:18:36Z') - +new Date('2023-04-22T20:28:29Z')

    const fixTime: number = mttr.getRestoreTime(bug)

    expect(fixTime).toBe(releaseDiff)
    // console.log(fixTime/(1000*60*60*24))
  })
  it('get time for a bug 2', () => {
    const bug: BugTime = {
      start: +new Date('2023-04-25T21:21:49Z'),
      end: +new Date('2023-04-29T12:54:45Z'),
      repo: 'devops-metrics-action'
    }
    const releaseDiff =
      +new Date('2023-04-30T16:06:06Z') - +new Date('2023-04-22T20:28:29Z')

    const fixTime: number = mttr.getRestoreTime(bug)

    expect(fixTime).toBe(releaseDiff)

    // console.log(fixTime/(1000*60*60*24))
  })

  it('get mttr for bug 1 when no release after bug 2', () => {
    const bugList: Issue[] = [
      {
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      },
      {
        created_at: '2023-04-25T21:21:49Z',
        closed_at: '2023-04-29T12:54:45Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      }
    ] as Issue[]
    const localReleases = [
      {
        published_at: '2023-04-25T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-20T00:00:00Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    // console.log(fixTime/(1000*60*60*24))
    const mttrEmpty = new MeanTimeToRestore(
      bugList,
      localReleases,
      new Date('2023-04-29T12:54:45Z')
    )
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4)
  })

  it('throw error when empty release list', () => {
    const m = (): void => {
      new MeanTimeToRestore([] as Issue[], [] as Release[])
    }
    expect(m).toThrow('Empty release list')
  })

  it('get mttr for bug 1 when release in wrong repo after bug 2', () => {
    const bugList: Issue[] = [
      {
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      },
      {
        created_at: '2023-04-25T21:21:49Z',
        closed_at: '2023-04-29T12:54:45Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      }
    ] as Issue[]
    const localReleases = [
      {
        published_at: '2023-04-25T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-30T00:00:00Z',
        url: 'path/with/other-repo/in/it'
      },
      {
        published_at: '2023-04-20T00:00:00Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    const mttrEmpty = new MeanTimeToRestore(
      bugList,
      localReleases,
      new Date('2023-04-30T00:00:00Z')
    )
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4)
  })

  it('get mttr for 2 bugs when release after bug 2', () => {
    const bugList: Issue[] = [
      {
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      },
      {
        created_at: '2023-04-25T21:21:49Z',
        closed_at: '2023-04-29T12:54:45Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      }
    ] as Issue[]
    const localReleases = [
      {
        published_at: '2023-04-30T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-20T00:00:00Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    // console.log(fixTime/(1000*60*60*24))
    const mttrEmpty = new MeanTimeToRestore(
      bugList,
      localReleases,
      new Date('2023-04-30T00:00:00Z')
    )
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(5)
  })

  it('get mttr for 2 bugs on two repos when release after bug 2', () => {
    const bugList: Issue[] = [
      {
        // 21 -> 24 = 3
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/other-repo'
      },
      {
        // 24 -> 30 = 6
        created_at: '2023-04-25T21:21:49Z',
        closed_at: '2023-04-29T12:54:45Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      }
    ] as Issue[]
    const localReleases = [
      {
        published_at: '2023-04-30T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-20T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-21T00:00:00Z',
        url: 'path/with/other-repo/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/other-repo/in/it'
      }
    ] as Release[]

    const mttrEmpty = new MeanTimeToRestore(
      bugList,
      localReleases,
      new Date('2023-04-30T00:00:00Z')
    )
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(4.5)
  })

  it('get mttr for 2 bugs on two repos when no release after bug 1', () => {
    const bugList: Issue[] = [
      {
        // 21 -> 24 = 3
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/other-repo'
      },
      {
        // 24 -> 30 = 6
        created_at: '2023-04-25T21:21:49Z',
        closed_at: '2023-04-29T12:54:45Z',
        labels: [{ name: 'bug' }],
        repository_url: 'some-path/repository'
      }
    ] as Issue[]
    const localReleases = [
      {
        published_at: '2023-04-30T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-24T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-20T00:00:00Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-21T00:00:00Z',
        url: 'path/with/other-repo/in/it'
      }
    ] as Release[]

    const mttrEmpty = new MeanTimeToRestore(
      bugList,
      localReleases,
      new Date('2023-04-30T00:00:00Z')
    )
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(6)
  })
  it('get average time to repair', () => {
    const avMttr: number = mttr.mttr()

    expect(avMttr).toBeGreaterThan(6.4)
    expect(avMttr).toBeLessThan(7.9)
  })

  it('throw excepiton when no releases', () => {
    const emptyReleaseList: Release[] = []

    const t = (): void => {
      new MeanTimeToRestore(issues, emptyReleaseList)
    }

    expect(t).toThrow('Empty release list')
  })

  it('return 0 when no bugs', () => {
    const emptyBugList: Issue[] = []

    const mttrEmpty = new MeanTimeToRestore(emptyBugList, releases)
    const meanTime = mttrEmpty.mttr()

    expect(meanTime).toBe(0)
  })
})
