import {CommitsAdapter} from '../src/CommitsAdapter'
import {Commit} from '../src/types/Commit'
import {PullRequest} from '../src/types/PullRequest'
import {Release} from '../src/types/Release'
import {LeadTime} from '../src/LeadTime'
import {expect, jest, test} from '@jest/globals'

describe('LeadTime should', () => {
  const cmtsAdptrMock: CommitsAdapter = new CommitsAdapter('')
  cmtsAdptrMock.getCommitsFromUrl = jest.fn(
    (url: string): Promise<Commit[] | undefined> => {
      return Promise.resolve([{}] as Commit[])
    }
  )

  it('return 0 on no pullrequests', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [{published_at: '2023-04-30T17:50:53Z'}] as Release[],
      cmtsAdptrMock,
      new Date()
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no closed pullrequests', async () => {
    const pulls = [
      {
        merged_at: ''
      }
    ] as PullRequest[]
    const lt = new LeadTime(
      pulls,
      [{published_at: '2023-04-30T17:50:53Z'}] as Release[],
      cmtsAdptrMock,
      new Date()
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no releases', async () => {
    const pulls = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: {ref: 'main'}
      }
    ] as PullRequest[]

    const lt = new LeadTime(pulls, [], cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on no pullrequests with base.ref = main', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z',
        base: {
          ref: 'other'
        }
      }
    ] as PullRequest[]
    const lt = new LeadTime(pulls, [], cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 0 on 1 pullrequest with no commits', async () => {
    const pulls = [] as PullRequest[]
    const lt = new LeadTime(pulls, [], cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })

  it('return 8 on pullrequests with base.ref = main', async () => {
    const pullRequests = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      }
    ] as PullRequest[]
    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
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
    const lt = new LeadTime(pullRequests, releases, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8)
  })

  it('return 8 on pullrequests with base.ref = main and earlier release on other repo', async () => {
    const pullRequests = [
      {
        merged_at: '2023-04-28T17:50:53Z', // 30-22 = 8
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
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
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
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
    const lt = new LeadTime(pullRequests, releases, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8)
  })

  it('return 0 on too old pullrequests', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
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
      cmtsAdptrMock,
      new Date('2023-06-29T17:50:53Z')
    )

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(0)
  })
  it('return 11 on pullrequests with two commits', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      }
    ] as PullRequest[]
    const rels = [
      {
        url: 'https://api.github.com/repos/stenjo/devops-metrics-action/releases/101411508',
        published_at: '2023-04-30T17:50:53Z'
      }
    ] as Release[]
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          {commit: {committer: {date: '2023-04-22T17:50:53Z'}}},
          {commit: {committer: {date: '2023-04-19T17:50:53Z'}}}
        ] as Commit[])
      }
    )

    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(11)
  })

  it('return 10.5 on pullrequests with two pulls on different repos', async () => {
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-28T17:50:53Z', // 29-19 = 10
        base: {ref: 'main', repo: {name: 'other-repo'}}
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
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve([
          {commit: {committer: {date: '2023-04-22T17:50:53Z'}}},
          {commit: {committer: {date: '2023-04-19T17:50:53Z'}}}
        ] as Commit[])
      }
    )

    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(10.5)
  })

  it('return 8.5 on two pullrequests with two commits', async () => {
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // 30-19 = 11
        commits_url: '47',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-27T17:50:53Z', // 28-22 = 6
        commits_url: '10',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
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
    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8.5) // (11+6)/2
  })

  it('return 6,67 on three pullrequests with one commit each', async () => {
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // Has a commit 19/4, first release is 30/4 -> Lead time 11 days
        commits_url: '47',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
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

    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6.67) // (11+6+3)/3
  })

  it('return 6 on three pullrequests with one commit each and two latest not released', async () => {
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-29T17:50:53Z', // Has a commit 19/4, first release is 30/4 -> Lead time 11 days
        commits_url: '47',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
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

    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(6) // (6)/1
  })

  it('return 8 on three pullrequests with one commit each and two repos, latest not released', async () => {
    cmtsAdptrMock.getCommitsFromUrl = jest.fn(
      (url: string): Promise<Commit[] | undefined> => {
        return Promise.resolve(getCommits(url))
      }
    )
    // getCommits()
    // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4

    const pulls = [
      {
        merged_at: '2023-04-27T17:50:53Z', // Has a commit 19/4, first release is 29/4 -> Lead time 10 days
        commits_url: '47',
        base: {ref: 'main', repo: {name: 'other-repo'}}
      },
      {
        merged_at: '2023-04-27T17:50:53Z', //  Has a commit 22/4, first release is 28/4 -> Lead time 6 days
        commits_url: '10',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
      },
      {
        merged_at: '2023-04-29T17:50:53Z', //  Has a commit 27/4, first release is 30/4 -> Lead time 3 days
        commits_url: '15',
        base: {ref: 'main', repo: {name: 'devops-metrics-action'}}
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

    const lt = new LeadTime(pulls, rels, cmtsAdptrMock, new Date())

    const leadTime = await lt.getLeadTime()

    expect(leadTime).toBe(8) // (6+10)/2
  })

  // Returning commits from (10)=>22/4, (15)=>27/4 and (47)=>19/4
  async function getCommits(url: string): Promise<Commit[]> {
    if (url === '10') {
      return [
        {
          commit: {
            committer: {
              date: '2023-04-22T17:50:53Z'
            }
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
            }
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
            }
          }
        }
      ] as Commit[]
    }
    return []
  }
})
