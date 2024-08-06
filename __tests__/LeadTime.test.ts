import { CommitsAdapter } from '../src/CommitsAdapter'
import { Commit } from '../src/types/Commit'
import { PullRequest } from '../src/types/PullRequest'
import { Release } from '../src/types/Release'
import { LeadTime } from '../src/LeadTime'
import { expect, jest } from '@jest/globals'

describe('LeadTime should', () => {
  const commitsAdapter: CommitsAdapter = new CommitsAdapter('')
  commitsAdapter.getCommitsFromUrl = jest.fn(
    async (): Promise<Commit[] | undefined> => {
      return Promise.resolve([{}] as Commit[])
    }
  )

  it('return 0 on no pull-requests', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [{ published_at: '2023-04-30T17:50:53Z' }] as Release[],
      commitsAdapter,
      new Date()
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no closed pull-requests', async () => {
    const pulls = [
      {
        merged_at: ''
      }
    ] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [{ published_at: '2023-04-30T17:50:53Z' }] as Release[],
      commitsAdapter,
      new Date()
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no releases', async () => {
    const pulls = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: { ref: 'main' }
      }
    ] as PullRequest[]

    const lt = new LeadTime(pulls, [], commitsAdapter, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no pull-requests with base.ref = main', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z',
        base: {
          ref: 'other'
        }
      }
    ] as PullRequest[]
    const lt = new LeadTime(pulls, [], commitsAdapter, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on 1 pullrequest with no commits', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(pulls, [], commitsAdapter, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 8 on pull-requests with base.ref = main', async () => {
    const pullRequests = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]
    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          {
            commit: {
              committer: {
                date: '2023-04-22T17:50:53Z'
              }
            }
          }
        ] as Commit[])
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

  it('return 8 on pull-requests with base.ref = main and earlier release on other repo', async () => {
    const pullRequests = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        commits_url: 'path/to/commits/1'
      }
    ] as PullRequest[]
    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          { commit: { committer: { date: '2023-04-22T17:50:53Z' } } }
        ] as Commit[])
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
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          {
            commit: {
              committer: {
                date: '2023-04-22T17:50:53Z'
              }
            }
          }
        ] as Commit[])
      }
    )
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
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          { commit: { committer: { date: '2023-04-22T17:50:53Z' } } },
          { commit: { committer: { date: '2023-04-19T17:50:53Z' } } }
        ] as Commit[])
      }
    )

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(11)
  })

  it('return 10.5 on pull-requests with two pulls on different repos', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-28T17:50:53Z', // 29-19 = 10
        base: { ref: 'main', repo: { name: 'other-repo' } }
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        published_at: '2023-04-29T17:50:53Z'
      }
    ] as Release[]
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          { commit: { committer: { date: '2023-04-22T17:50:53Z' } } },
          { commit: { committer: { date: '2023-04-19T17:50:53Z' } } }
        ] as Commit[])
      }
    )

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(10.5)
  })

  it('return 8.5 on two pull-requests with two commits', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-27T17:50:53Z', // 28-22 = 6
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]
    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8.5) // (11+6)/2
  })

  it('return 6,67 on three pull-requests with one commit each', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // Has a commit 19/4, first release is 30/4 -> Lead time 11 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6.67) // (11+6+3)/3
  })

  it('return 6 on three pull-requests with one commit each and two latest not released', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // Has a commit 19/4, first release is 30/4 -> Lead time 11 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6) // (6)/1
  })

  it('return 8 on three pull-requests with one commit each and two repos, latest not released', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'other-repo' } }
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8) // (6+10)/2
  })

  it('get an empty log of releases or pulls', async () => {
    const lt = new LeadTime([], [], commitsAdapter)

    expect(lt.getLog().length).toBe(0)
  })

  it('get release log list weekly when rate calculated', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'other-repo' } }
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } }
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v1.1.0',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        name: 'v0.1.0',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v0.0.1',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    await lt.getLeadTime()

    expect(
      lt.getLog().filter(l => {
        return l.includes('release')
      }).length
    ).toBe(2)
  })
  it('get event log list when lead time calculated', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'other-repo' } },
        title: 'feat(docs): better description'
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'fix: removed error message'
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'feat: handle several repos'
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v1.1.0',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        name: 'v0.1.0',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v0.0.1',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

    const lt = new LeadTime(pulls, rels, commitsAdapter, new Date('2023-05-01'))
    await lt.getLeadTime()

    const log = lt.getLog()

    // console.log(log)

    expect(
      log.filter(l => {
        return l.includes('pull')
      }).length
    ).toBe(2)
  })

  it('get event log list when lead time calculated and filtered', async () => {
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'other-repo' } },
        title: 'feat(docs): better description'
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'chore: cleaned up'
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'fix: removed error message'
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v1.1.0',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        name: 'v0.1.0',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v0.0.1',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

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
    commitsAdapter.getCommitsFromUrl = jest.fn(
      async (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: { ref: 'main', repo: { name: 'other-repo' } },
        title: 'chore(docs): better description'
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'chore: cleaned up'
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: { ref: 'main', repo: { name: 'devops-metrics-action' } },
        title: 'ci: removed error message'
      }
    ] as PullRequest[]

    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v1.1.0',
        published_at: '2023-04-28T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        name: 'v0.1.0',
        published_at: '2023-04-29T17:50:53Z'
      },
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        name: 'v0.0.1',
        published_at: '2023-04-02T17:50:53Z'
      }
    ] as Release[]

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

  // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
  async function getCommits(url: string): Promise<Commit[]> {
    if (url === '10') {
      return [
        {
          commit: {
            committer: {
              date: '2023-04-22T17:50:53Z'
            },
            message: 'wip: changed to commonjs'
          }
        }
      ] as Commit[]
    }
    if (url === '15') {
      return [
        {
          commit: {
            committer: {
              date: '2023-04-27T17:50:53Z'
            },
            message: 'fix(workflow): update release and dora workflows'
          }
        }
      ] as Commit[]
    }
    if (url === '47') {
      return [
        {
          commit: {
            committer: {
              date: '2023-04-19T17:50:53Z'
            },
            message: 'all passing'
          }
        }
      ] as Commit[]
    }
    return []
  }
})
