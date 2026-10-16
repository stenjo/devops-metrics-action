import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {Commit} from '../src/types/Commit'
import type {PullRequest} from '../src/types/PullRequest'
import type {Release} from '../src/types/Release'
import type {RepoKey} from '../src/types/RepoKey'
import type {ICommitsAdapter} from '../src/interfaces/ICommitsAdapter'
import {LeadTime, defaultLeadTimeLimits} from '../src/LeadTime'
import {commit, pull, release, ts, windowAt} from './helpers/domain'

const DMA = 'stenjo/devops-metrics-action'
const OTHER = 'stenjo/other-repo'

describe('LeadTime should', () => {
  const commitsAdapter: CommitsAdapter = new CommitsAdapter(new GitHubClient())
  commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => {
    return Promise.resolve([commit('2023-04-22T17:50:53Z')])
  })

  it('return 0 on no pull-requests', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commitsAdapter,
      {window: windowAt()}
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no closed pull-requests', async () => {
    const pulls = [pull({mergedAt: null})]
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commitsAdapter,
      {window: windowAt('2023-05-01')}
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no releases', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-28T17:50:53Z')})]

    const lt = new LeadTime(pulls, [], commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no pull-requests with baseRef = main', async () => {
    const pulls = [pull({baseRef: 'other'})]
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commitsAdapter,
      {window: windowAt('2023-05-01')}
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 8 on pull-requests with baseRef = main', async () => {
    const pullRequests = [pull({mergedAt: ts('2023-04-28T17:50:53Z')})] // 30-22 = 8
    const releases = [release('2023-04-30T17:50:53Z')]
    commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => {
      return Promise.resolve([commit('2023-04-22T17:50:53Z')])
    })
    const lt = new LeadTime(pullRequests, releases, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8)
  })

  it('return 8 on pull-requests with baseRef = main and earlier release on other repo', async () => {
    const pullRequests = [
      pull({
        mergedAt: ts('2023-04-28T17:50:53Z'),
        number: 1
      }) // 30-22 = 8
    ]
    const releases = [
      release('2023-04-29T17:50:53Z', OTHER),
      release('2023-04-30T17:50:53Z', DMA)
    ]
    commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => {
      return Promise.resolve([commit('2023-04-22T17:50:53Z')])
    })
    const lt = new LeadTime(pullRequests, releases, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commitsAdapter.getCommits).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commitsAdapter.getCommits).toHaveBeenLastCalledWith(DMA, 1)
    expect(leadTime).toBe(8)
  })

  it('return 0 on too old pull-requests', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-29T17:50:53Z')})]
    const rels = [release('2023-04-30T17:50:53Z')]
    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-06-29T17:50:53Z')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 11 on pull-requests with two commits', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-29T17:50:53Z')})] // 30-19 = 11
    const rels = [release('2023-04-30T17:50:53Z')]
    commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => {
      return Promise.resolve([
        commit('2023-04-22T17:50:53Z'),
        commit('2023-04-19T17:50:53Z')
      ])
    })

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(11)
  })

  it('return 10.5 on pull-requests with two pulls on different repos', async () => {
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), repo: DMA}), // 30-19 = 11
      pull({mergedAt: ts('2023-04-28T17:50:53Z'), repo: OTHER}) // 29-19 = 10
    ]
    const rels = [
      release('2023-04-30T17:50:53Z', DMA),
      release('2023-04-29T17:50:53Z', OTHER)
    ]
    commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => {
      return Promise.resolve([
        commit('2023-04-22T17:50:53Z'),
        commit('2023-04-19T17:50:53Z')
      ])
    })

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(10.5)
  })

  it('return 8.5 on two pull-requests with two commits', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 47}), // 30-19 = 11
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), number: 10}) // 28-22 = 6
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-30T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]
    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8.5) // (11+6)/2
  })

  it('return 6,67 on three pull-requests with one commit each', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 47}), // commit 19/4, release 30/4 -> 11 days
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), number: 10}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 15}) // commit 27/4, release 30/4 -> 3 days
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-30T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6.67) // (11+6+3)/3
  })

  it('return 6 on three pull-requests with one commit each and two latest not released', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 47}),
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), number: 10}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 15})
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6) // (6)/1
  })

  it('return 8 on three pull-requests with one commit each and two repos, latest not released', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 47,
        repo: OTHER
      }), // commit 19/4, release 29/4 -> 10 days
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), number: 10, repo: DMA}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 15, repo: DMA}) // not released
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA),
      release('2023-04-29T17:50:53Z', OTHER),
      release('2023-04-02T17:50:53Z', DMA)
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8) // (6+10)/2
  })

  it('not attribute releases of a repo whose name is a prefix of another', async () => {
    commitsAdapter.getCommits = vi.fn(async (): Promise<Commit[]> => [
      commit('2023-04-22T17:50:53Z')
    ])
    const pulls = [pull({mergedAt: ts('2023-04-28T17:50:53Z'), repo: 'o/api'})]
    const onlyGateway = [release('2023-04-30T17:50:53Z', 'o/api-gateway')]
    const both = [
      release('2023-04-29T17:50:53Z', 'o/api-gateway'),
      release('2023-05-01T17:50:53Z', 'o/api')
    ]

    const unreleased = new LeadTime(pulls, onlyGateway, commitsAdapter, {
      window: windowAt('2023-05-02')
    })
    const released = new LeadTime(pulls, both, commitsAdapter, {
      window: windowAt('2023-05-02')
    })

    expect(await unreleased.getLeadTime()).toBe(0)
    expect(await released.getLeadTime()).toBe(9) // 1/5 - 22/4, not 29/4
  })

  it('get an empty log of releases or pulls', async () => {
    const lt = new LeadTime([], [], commitsAdapter, {window: windowAt()})

    expect(lt.getLog().length).toBe(0)
  })

  it('get release log list weekly when rate calculated', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 47,
        repo: OTHER
      }),
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), number: 10, repo: DMA}),
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), number: 15, repo: DMA})
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })
    await lt.getLeadTime()

    expect(lt.getLog().map(l => l.release)).toEqual(['v0.1.0', 'v1.1.0'])
  })

  it('get event log list when lead time calculated', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 47,
        repo: OTHER,
        title: 'feat(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 10,
        repo: DMA,
        title: 'fix: removed error message'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        number: 15,
        repo: DMA,
        title: 'feat: handle several repos'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })
    await lt.getLeadTime()

    const log = lt.getLog()

    expect(log.filter(l => l.kind === 'pull').length).toBe(2)
  })

  it('get event log list when lead time calculated and filtered', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 47,
        repo: OTHER,
        title: 'feat(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 10,
        repo: DMA,
        title: 'chore: cleaned up'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        number: 15,
        repo: DMA,
        title: 'fix: removed error message'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })
    const leadTime = await lt.getLeadTime(true)

    const log = lt.getLog()

    expect(log.filter(l => l.kind === 'pull').length).toBe(1)

    expect(leadTime).toBe(10)
  })

  it('get event log list when lead time calculated and filtered with no fix or feat', async () => {
    commitsAdapter.getCommits = vi.fn(getCommits)
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 47,
        repo: OTHER,
        title: 'chore(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        number: 10,
        repo: DMA,
        title: 'chore: cleaned up'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        number: 15,
        repo: DMA,
        title: 'ci: removed error message'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, {
      window: windowAt('2023-05-01')
    })
    const leadTime = await lt.getLeadTime(true)

    const log = lt.getLog()

    expect(log.filter(l => l.kind === 'pull').length).toBe(0)

    expect(leadTime).toBe(0)
  })

  describe('edge cases', () => {
    const repoRelease: Release = release('2023-04-30T17:50:53Z', DMA, 'v1.0.0')
    const today = new Date('2023-05-01T00:00:00Z')
    const mainPull = pull({
      mergedAt: ts('2023-04-28T17:50:53Z'),
      number: 47,
      title: 'feat: something'
    })
    const adapter: CommitsAdapter = new CommitsAdapter(new GitHubClient())
    adapter.getCommits = vi.fn(getCommits)

    it('exclude a pull merged 1 ms before the window starts', async () => {
      const pulls = [{...mainPull, mergedAt: ts('2023-03-31T23:59:59.999Z')}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime()).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('include a pull merged exactly 30 days ago', async () => {
      const pulls = [{...mainPull, mergedAt: ts('2023-04-01T00:00:00Z')}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime()).toBeGreaterThan(0)
    })

    it('not write the filtered log line when there are no pulls', async () => {
      const lt = new LeadTime([], [repoRelease], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime(true)).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('not write the filtered log line when there are no releases', async () => {
      const lt = new LeadTime([mainPull], [], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime(true)).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('log only pull records whether filtered or not', async () => {
      const filtered = new LeadTime([mainPull], [repoRelease], adapter, {
        window: windowAt(today)
      })
      await filtered.getLeadTime(true)
      const unfiltered = new LeadTime([mainPull], [repoRelease], adapter, {
        window: windowAt(today)
      })
      await unfiltered.getLeadTime(false)

      expect(filtered.getLog().map(l => l.kind)).toEqual(['pull'])
      expect(unfiltered.getLog()).toEqual(filtered.getLog())
    })

    it('drop unmerged pulls in the constructor', () => {
      const lt = new LeadTime(
        [mainPull, {...mainPull, mergedAt: null}],
        [repoRelease],
        adapter,
        {window: windowAt(today)}
      )

      expect(lt.pulls).toEqual([mainPull])
    })

    it('ignore a pull not merged to main even when releases exist', async () => {
      const pulls = [{...mainPull, baseRef: 'develop'}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime()).toBe(0)
    })

    it('ignore a release published at the exact merge time', async () => {
      const rel = {...repoRelease, publishedAt: mainPull.mergedAt as number}
      const lt = new LeadTime([mainPull], [rel], adapter, {
        window: windowAt(today)
      })

      expect(await lt.getLeadTime()).toBe(0)
    })

    it('only match titles starting with feat or fix when filtered', async () => {
      const pulls = [
        {...mainPull, title: 'chore: hotfix'},
        {...mainPull, title: 'fix: real'},
        {...mainPull, title: 'feat: real'},
        {...mainPull, title: 'refactor: feat'}
      ]
      const lt = new LeadTime(pulls, [repoRelease], adapter, {
        window: windowAt(today)
      })
      await lt.getLeadTime(true)

      expect(lt.getLog().map(l => [l.at, l.title])).toEqual([
        ['2023-04-28T17:50:53Z', 'fix: real'],
        ['2023-04-28T17:50:53Z', 'feat: real']
      ])
    })

    it('log the earliest commit even when commits are unsorted', async () => {
      adapter.getCommits = vi.fn(async (): Promise<Commit[]> => [
        commit('2023-04-25T00:00:00Z', 'later'),
        commit('2023-04-20T00:00:00Z', 'first'),
        commit('2023-04-22T00:00:00Z', 'middle')
      ])
      const lt = new LeadTime([mainPull], [repoRelease], adapter, {
        window: windowAt(today)
      })

      const leadTime = await lt.getLeadTime()

      expect(leadTime).toBe(10.74)
      expect(lt.getLog()).toEqual([
        {
          kind: 'pull',
          repo: DMA,
          at: '2023-04-28T17:50:53Z',
          title: 'feat: something',
          commitAt: '2023-04-20T00:00:00Z',
          commitMessage: 'first',
          releaseAt: '2023-04-30T17:50:53Z',
          release: 'v1.0.0',
          leadTimeDays: 10.74
        }
      ])
    })
  })

  describe('request bounds', () => {
    const repoRelease: Release = release('2023-04-30T17:50:53Z', DMA, 'v1.0.0')
    const today = new Date('2023-05-01T00:00:00Z')
    const pulls = (count: number): PullRequest[] =>
      Array.from({length: count}, (_, i) =>
        pull({
          mergedAt: ts('2023-04-28T17:50:53Z'),
          number: i + 1,
          title: `feat: change ${(i + 1).toString()}`
        })
      )

    // Resolves each commit fetch on demand so concurrency can be observed.
    function trackingAdapter(): {
      adapter: ICommitsAdapter
      getCommits: Mock<ICommitsAdapter['getCommits']>
      inFlight: () => number
      maxInFlight: () => number
      release: (count: number) => void
      releaseLast: () => void
    } {
      let inFlight = 0
      let maxInFlight = 0
      const pending: (() => void)[] = []
      const getCommits = vi.fn(
        async (_repo: RepoKey, pullNumber: number): Promise<Commit[]> =>
          new Promise(resolve => {
            inFlight++
            maxInFlight = Math.max(maxInFlight, inFlight)
            pending.push(() => {
              inFlight--
              // Earlier commit for higher numbers, so order is visible in the log.
              resolve([
                commit(
                  `2023-04-${(20 - (pullNumber % 10)).toString().padStart(2, '0')}T00:00:00Z`,
                  `commit ${pullNumber.toString()}`
                )
              ])
            })
          })
      )
      return {
        adapter: {getCommits},
        getCommits,
        inFlight: () => inFlight,
        maxInFlight: () => maxInFlight,
        release: (count: number) => {
          for (let i = 0; i < count; i++) {
            pending.shift()?.()
          }
        },
        releaseLast: () => {
          pending.pop()?.()
        }
      }
    }

    const settle = async (): Promise<void> =>
      new Promise(resolve => setImmediate(resolve))

    // Releases one pending fetch at a time until the run completes.
    async function drain(
      tracker: ReturnType<typeof trackingAdapter>,
      run: Promise<number>
    ): Promise<number> {
      let done = false
      const settled = run.finally(() => {
        done = true
      })
      while (!done) {
        tracker.release(1)
        await settle()
      }
      return settled
    }

    it('default to at most 200 commit fetches, 4 in flight', () => {
      expect(defaultLeadTimeLimits()).toEqual({
        maxCommitFetches: 200,
        concurrency: 4
      })
    })

    it('fetch commits for at most 200 pull requests by default and warn once', async () => {
      const logger = {warning: vi.fn()}
      const getCommits = vi.fn(async (): Promise<Commit[]> => [
        commit('2023-04-20T00:00:00Z')
      ])
      const lt = new LeadTime(
        pulls(201),
        [repoRelease],
        {getCommits},
        {window: windowAt(today), logger}
      )

      const leadTime = await lt.getLeadTime()

      expect(getCommits).toHaveBeenCalledTimes(200)
      expect(lt.getLog()).toHaveLength(200)
      expect(lt.getLog().map(l => l.title)).toContain('feat: change 1')
      expect(lt.getLog().map(l => l.title)).toContain('feat: change 200')
      expect(lt.getLog().map(l => l.title)).not.toContain('feat: change 201')
      expect(leadTime).toBe(10.74)
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'Lead time: fetching commits for only the first 200 of 201 qualifying pull requests'
      )
    })

    it('not warn when the number of qualifying pull requests equals the cap', async () => {
      const logger = {warning: vi.fn()}
      const getCommits = vi.fn(async (): Promise<Commit[]> => [
        commit('2023-04-20T00:00:00Z')
      ])
      const lt = new LeadTime(
        pulls(3),
        [repoRelease],
        {getCommits},
        {
          window: windowAt(today),
          logger,
          limits: {maxCommitFetches: 3, concurrency: 4}
        }
      )

      await lt.getLeadTime()

      expect(getCommits).toHaveBeenCalledTimes(3)
      expect(logger.warning).not.toHaveBeenCalled()
    })

    it('count only qualifying pull requests against the cap', async () => {
      const logger = {warning: vi.fn()}
      const getCommits = vi.fn(async (): Promise<Commit[]> => [
        commit('2023-04-20T00:00:00Z')
      ])
      const input = [
        ...pulls(2),
        pull({mergedAt: ts('2023-04-28T17:50:53Z'), baseRef: 'develop'}),
        pull({mergedAt: ts('2023-04-28T17:50:53Z'), repo: OTHER})
      ]
      const lt = new LeadTime(
        input,
        [repoRelease],
        {getCommits},
        {
          window: windowAt(today),
          logger,
          limits: {
            maxCommitFetches: 2,
            concurrency: 4
          }
        }
      )

      await lt.getLeadTime()

      expect(getCommits).toHaveBeenCalledTimes(2)
      expect(logger.warning).not.toHaveBeenCalled()
    })

    it('keep the sampled pull requests in input order and skip the rest', async () => {
      const logger = {warning: vi.fn()}
      const tracker = trackingAdapter()
      const lt = new LeadTime(pulls(5), [repoRelease], tracker.adapter, {
        window: windowAt(today),
        logger,
        limits: {maxCommitFetches: 3, concurrency: 1}
      })

      const run = lt.getLeadTime()
      await settle()
      tracker.release(1)
      await settle()
      tracker.release(1)
      await settle()
      tracker.release(1)
      await run

      expect(tracker.getCommits.mock.calls.map(c => c[1])).toEqual([1, 2, 3])
      expect(lt.getLog().map(l => l.title)).toEqual([
        'feat: change 1',
        'feat: change 2',
        'feat: change 3'
      ])
      expect(logger.warning).toHaveBeenCalledExactlyOnceWith(
        'Lead time: fetching commits for only the first 3 of 5 qualifying pull requests'
      )
    })

    it('fetch commits with at most 4 requests in flight by default', async () => {
      const tracker = trackingAdapter()
      const lt = new LeadTime(pulls(10), [repoRelease], tracker.adapter, {
        window: windowAt(today)
      })

      const run = lt.getLeadTime()
      await settle()
      expect(tracker.inFlight()).toBe(4)
      expect(tracker.getCommits).toHaveBeenCalledTimes(4)

      tracker.release(1)
      await settle()
      expect(tracker.inFlight()).toBe(4)
      expect(tracker.getCommits).toHaveBeenCalledTimes(5)

      await drain(tracker, run)

      expect(tracker.maxInFlight()).toBe(4)
      expect(tracker.getCommits).toHaveBeenCalledTimes(10)
      expect(lt.getLog()).toHaveLength(10)
    })

    it('honour an injected concurrency limit', async () => {
      const tracker = trackingAdapter()
      const lt = new LeadTime(pulls(5), [repoRelease], tracker.adapter, {
        window: windowAt(today),
        limits: {maxCommitFetches: 200, concurrency: 2}
      })

      const run = lt.getLeadTime()
      await settle()
      expect(tracker.inFlight()).toBe(2)

      await drain(tracker, run)

      expect(tracker.maxInFlight()).toBe(2)
      expect(tracker.getCommits).toHaveBeenCalledTimes(5)
    })

    it('keep log order by pull request even when fetches finish out of order', async () => {
      const tracker = trackingAdapter()
      const lt = new LeadTime(pulls(4), [repoRelease], tracker.adapter, {
        window: windowAt(today),
        limits: {maxCommitFetches: 200, concurrency: 4}
      })

      const run = lt.getLeadTime()
      await settle()
      // All four are in flight; finish 4 and 3 before 1 and 2.
      tracker.releaseLast()
      tracker.releaseLast()
      await settle()
      tracker.release(2)
      await run

      expect(tracker.getCommits.mock.calls.map(c => c[1])).toEqual([1, 2, 3, 4])
      expect(lt.getLog().map(l => [l.title, l.commitMessage])).toEqual([
        ['feat: change 1', 'commit 1'],
        ['feat: change 2', 'commit 2'],
        ['feat: change 3', 'commit 3'],
        ['feat: change 4', 'commit 4']
      ])
    })

    it('propagate a failing commit fetch', async () => {
      const getCommits = vi.fn(async (): Promise<Commit[]> => {
        throw new Error('boom')
      })
      const lt = new LeadTime(
        pulls(3),
        [repoRelease],
        {getCommits},
        {window: windowAt(today)}
      )

      await expect(lt.getLeadTime()).rejects.toThrow('boom')
    })
  })

  // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
  async function getCommits(
    _repo: RepoKey,
    pullNumber: number
  ): Promise<Commit[]> {
    if (pullNumber === 10) {
      return [commit('2023-04-22T17:50:53Z', 'wip: changed to commonjs')]
    }
    if (pullNumber === 15) {
      return [
        commit(
          '2023-04-27T17:50:53Z',
          'fix(workflow): update release and dora workflows'
        )
      ]
    }
    if (pullNumber === 47) {
      return [commit('2023-04-19T17:50:53Z', 'all passing')]
    }
    return []
  }
})
