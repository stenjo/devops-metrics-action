import {CommitsAdapter} from '../src/CommitsAdapter'
import {GitHubClient} from '../src/GitHubClient'
import type {Commit} from '../src/types/Commit'
import type {PullRequest} from '../src/types/PullRequest'
import type {Release} from '../src/types/Release'
import {LeadTime} from '../src/LeadTime'
import {commit, pull, release, ts} from './helpers/domain'

const DMA = 'stenjo/devops-metrics-action'
const OTHER = 'stenjo/other-repo'

describe('LeadTime should', () => {
  const commitsAdapter: CommitsAdapter = new CommitsAdapter(new GitHubClient())
  commitsAdapter.getCommitsFromUrl = vi.fn(
    async (): Promise<Commit[] | undefined> => {
      return Promise.resolve([commit('2023-04-22T17:50:53Z')])
    }
  )

  it('return 0 on no pull-requests', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commitsAdapter,
      new Date()
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
      new Date('2023-05-01')
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no releases', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-28T17:50:53Z')})]

    const lt = new LeadTime(pulls, [], commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no pull-requests with baseRef = main', async () => {
    const pulls = [pull({baseRef: 'other'})]
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commitsAdapter,
      new Date('2023-05-01')
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 8 on pull-requests with baseRef = main', async () => {
    const pullRequests = [pull({mergedAt: ts('2023-04-28T17:50:53Z')})] // 30-22 = 8
    const releases = [release('2023-04-30T17:50:53Z')]
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([commit('2023-04-22T17:50:53Z')])
      }
    )
    const lt = new LeadTime(
      pullRequests,
      releases,
      commitsAdapter,
      new Date('2023-05-01')
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8)
  })

  it('return 8 on pull-requests with baseRef = main and earlier release on other repo', async () => {
    const pullRequests = [
      pull({
        mergedAt: ts('2023-04-28T17:50:53Z'),
        commitsUrl: 'path/to/commits/1'
      }) // 30-22 = 8
    ]
    const releases = [
      release('2023-04-29T17:50:53Z', OTHER),
      release('2023-04-30T17:50:53Z', DMA)
    ]
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([commit('2023-04-22T17:50:53Z')])
      }
    )
    const lt = new LeadTime(
      pullRequests,
      releases,
      commitsAdapter,
      new Date('2023-05-01')
    )

    const leadTime = await lt.getLeadTime()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commitsAdapter.getCommitsFromUrl).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(commitsAdapter.getCommitsFromUrl).toHaveBeenLastCalledWith(
      'path/to/commits/1'
    )
    expect(leadTime).toBe(8)
  })

  it('return 0 on too old pull-requests', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-29T17:50:53Z')})]
    const rels = [release('2023-04-30T17:50:53Z')]
    const lt = new LeadTime(
      pulls,
      rels,
      commitsAdapter,
      new Date('2023-06-29T17:50:53Z')
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 11 on pull-requests with two commits', async () => {
    const pulls = [pull({mergedAt: ts('2023-04-29T17:50:53Z')})] // 30-19 = 11
    const rels = [release('2023-04-30T17:50:53Z')]
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          commit('2023-04-22T17:50:53Z'),
          commit('2023-04-19T17:50:53Z')
        ])
      }
    )

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

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
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          commit('2023-04-22T17:50:53Z'),
          commit('2023-04-19T17:50:53Z')
        ])
      }
    )

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(10.5)
  })

  it('return 8.5 on two pull-requests with two commits', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '47'}), // 30-19 = 11
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), commitsUrl: '10'}) // 28-22 = 6
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-30T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]
    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8.5) // (11+6)/2
  })

  it('return 6,67 on three pull-requests with one commit each', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '47'}), // commit 19/4, release 30/4 -> 11 days
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), commitsUrl: '10'}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '15'}) // commit 27/4, release 30/4 -> 3 days
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-30T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6.67) // (11+6+3)/3
  })

  it('return 6 on three pull-requests with one commit each and two latest not released', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '47'}),
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), commitsUrl: '10'}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '15'})
    ]
    const rels = [
      release('2023-04-28T17:50:53Z'),
      release('2023-04-02T17:50:53Z')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6) // (6)/1
  })

  it('return 8 on three pull-requests with one commit each and two repos, latest not released', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '47',
        repo: OTHER
      }), // commit 19/4, release 29/4 -> 10 days
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), commitsUrl: '10', repo: DMA}), // commit 22/4, release 28/4 -> 6 days
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '15', repo: DMA}) // not released
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA),
      release('2023-04-29T17:50:53Z', OTHER),
      release('2023-04-02T17:50:53Z', DMA)
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8) // (6+10)/2
  })

  it('not attribute releases of a repo whose name is a prefix of another', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(async (): Promise<Commit[]> => [
      commit('2023-04-22T17:50:53Z')
    ])
    const pulls = [pull({mergedAt: ts('2023-04-28T17:50:53Z'), repo: 'o/api'})]
    const onlyGateway = [release('2023-04-30T17:50:53Z', 'o/api-gateway')]
    const both = [
      release('2023-04-29T17:50:53Z', 'o/api-gateway'),
      release('2023-05-01T17:50:53Z', 'o/api')
    ]

    const unreleased = new LeadTime(
      pulls,
      onlyGateway,
      commitsAdapter,
      new Date('2023-05-02')
    )
    const released = new LeadTime(
      pulls,
      both,
      commitsAdapter,
      new Date('2023-05-02')
    )

    expect(await unreleased.getLeadTime()).toBe(0)
    expect(await released.getLeadTime()).toBe(9) // 1/5 - 22/4, not 29/4
  })

  it('get an empty log of releases or pulls', async () => {
    const lt = new LeadTime([], [], commitsAdapter)

    expect(lt.getLog().length).toBe(0)
  })

  it('get release log list weekly when rate calculated', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '47',
        repo: OTHER
      }),
      pull({mergedAt: ts('2023-04-27T17:50:53Z'), commitsUrl: '10', repo: DMA}),
      pull({mergedAt: ts('2023-04-29T17:50:53Z'), commitsUrl: '15', repo: DMA})
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    await lt.getLeadTime()

    expect(
      lt.getLog().filter(l => {
        return l.includes('release')
      }).length
    ).toBe(2)
  })

  it('get event log list when lead time calculated', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '47',
        repo: OTHER,
        title: 'feat(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '10',
        repo: DMA,
        title: 'fix: removed error message'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        commitsUrl: '15',
        repo: DMA,
        title: 'feat: handle several repos'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    await lt.getLeadTime()

    const log = lt.getLog()

    expect(
      log.filter(l => {
        return l.includes('pull')
      }).length
    ).toBe(2)
  })

  it('get event log list when lead time calculated and filtered', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '47',
        repo: OTHER,
        title: 'feat(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '10',
        repo: DMA,
        title: 'chore: cleaned up'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        commitsUrl: '15',
        repo: DMA,
        title: 'fix: removed error message'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    const leadTime = await lt.getLeadTime(true)

    const log = lt.getLog()

    expect(
      log.filter(l => {
        return l.includes('pull')
      }).length
    ).toBe(1)

    expect(leadTime).toBe(10)
  })

  it('get event log list when lead time calculated and filtered with no fix or feat', async () => {
    commitsAdapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    const pulls = [
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '47',
        repo: OTHER,
        title: 'chore(docs): better description'
      }),
      pull({
        mergedAt: ts('2023-04-27T17:50:53Z'),
        commitsUrl: '10',
        repo: DMA,
        title: 'chore: cleaned up'
      }),
      pull({
        mergedAt: ts('2023-04-29T17:50:53Z'),
        commitsUrl: '15',
        repo: DMA,
        title: 'ci: removed error message'
      })
    ]
    const rels = [
      release('2023-04-28T17:50:53Z', DMA, 'v1.1.0'),
      release('2023-04-29T17:50:53Z', OTHER, 'v0.1.0'),
      release('2023-04-02T17:50:53Z', DMA, 'v0.0.1')
    ]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    const leadTime = await lt.getLeadTime(true)

    const log = lt.getLog()

    expect(
      log.filter(l => {
        return l.includes('pull')
      }).length
    ).toBe(0)

    expect(leadTime).toBe(0)
  })

  describe('edge cases', () => {
    const repoRelease: Release = release('2023-04-30T17:50:53Z', DMA, 'v1.0.0')
    const today = new Date('2023-05-01T00:00:00Z')
    const mainPull = pull({
      mergedAt: ts('2023-04-28T17:50:53Z'),
      commitsUrl: '47',
      title: 'feat: something'
    })
    const adapter: CommitsAdapter = new CommitsAdapter(new GitHubClient())
    adapter.getCommitsFromUrl = vi.fn(
      async (url: string): Promise<Commit[] | undefined> => getCommits(url)
    )

    it('exclude a pull merged exactly 31 days ago', async () => {
      const pulls = [{...mainPull, mergedAt: ts('2023-03-31T00:00:00Z')}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, today)

      expect(await lt.getLeadTime()).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('include a pull merged just under 31 days ago', async () => {
      const pulls = [{...mainPull, mergedAt: ts('2023-03-31T00:00:01Z')}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, today)

      expect(await lt.getLeadTime()).toBeGreaterThan(0)
    })

    it('not write the filtered log line when there are no pulls', async () => {
      const lt = new LeadTime([], [repoRelease], adapter, today)

      expect(await lt.getLeadTime(true)).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('not write the filtered log line when there are no releases', async () => {
      const lt = new LeadTime([mainPull], [], adapter, today)

      expect(await lt.getLeadTime(true)).toBe(0)
      expect(lt.getLog()).toEqual([])
    })

    it('write the filtered log line first only when filtered', async () => {
      const filtered = new LeadTime([mainPull], [repoRelease], adapter, today)
      await filtered.getLeadTime(true)
      const unfiltered = new LeadTime([mainPull], [repoRelease], adapter, today)
      await unfiltered.getLeadTime(false)

      expect(filtered.getLog()[0]).toBe(
        `\nLog is filtered - only feat and fix.`
      )
      expect(unfiltered.getLog()).not.toContain(
        `\nLog is filtered - only feat and fix.`
      )
    })

    it('drop unmerged pulls in the constructor', () => {
      const lt = new LeadTime(
        [mainPull, {...mainPull, mergedAt: null}],
        [repoRelease],
        adapter,
        today
      )

      expect(lt.pulls).toEqual([mainPull])
    })

    it('ignore a pull not merged to main even when releases exist', async () => {
      const pulls = [{...mainPull, baseRef: 'develop'}]
      const lt = new LeadTime(pulls, [repoRelease], adapter, today)

      expect(await lt.getLeadTime()).toBe(0)
    })

    it('ignore a release published at the exact merge time', async () => {
      const rel = {...repoRelease, publishedAt: mainPull.mergedAt as number}
      const lt = new LeadTime([mainPull], [rel], adapter, today)

      expect(await lt.getLeadTime()).toBe(0)
    })

    it('only match titles starting with feat or fix when filtered', async () => {
      const pulls = [
        {...mainPull, title: 'chore: hotfix'},
        {...mainPull, title: 'fix: real'},
        {...mainPull, title: 'feat: real'},
        {...mainPull, title: 'refactor: feat'}
      ]
      const lt = new LeadTime(pulls, [repoRelease], adapter, today)
      await lt.getLeadTime(true)

      const pullLines = lt.getLog().filter(l => l.startsWith('pull->'))
      expect(pullLines).toEqual([
        'pull->      2023-04-28T17:50:53Z : fix: real',
        'pull->      2023-04-28T17:50:53Z : feat: real'
      ])
    })

    it('log the earliest commit even when commits are unsorted', async () => {
      adapter.getCommitsFromUrl = vi.fn(async (): Promise<Commit[]> => [
        commit('2023-04-25T00:00:00Z', 'later'),
        commit('2023-04-20T00:00:00Z', 'first'),
        commit('2023-04-22T00:00:00Z', 'middle')
      ])
      const lt = new LeadTime([mainPull], [repoRelease], adapter, today)

      const leadTime = await lt.getLeadTime()

      expect(leadTime).toBe(10.74)
      expect(lt.getLog()).toEqual([
        'pull->      2023-04-28T17:50:53Z : feat: something',
        '  commit->  2023-04-20T00:00:00Z : first',
        '  release-> 2023-04-30T17:50:53Z : v1.0.0',
        '  10.74 days'
      ])
    })
  })

  // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
  async function getCommits(url: string): Promise<Commit[]> {
    if (url === '10') {
      return [commit('2023-04-22T17:50:53Z', 'wip: changed to commonjs')]
    }
    if (url === '15') {
      return [
        commit(
          '2023-04-27T17:50:53Z',
          'fix(workflow): update release and dora workflows'
        )
      ]
    }
    if (url === '47') {
      return [commit('2023-04-19T17:50:53Z', 'all passing')]
    }
    return []
  }
})
