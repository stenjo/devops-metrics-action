import { Issue } from '../src/types/Issue'
import fs from 'fs'
import { ChangeFailureRate } from '../src/ChangeFailureRate'
import { Release } from '../src/types/Release'

describe('ChangeFailureRate should', () => {
  it('get number of bugs created', () => {
    const issues: Issue[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/issue-list.json', 'utf8')
    )
    const releases: Release[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/releases.json', 'utf8')
    )
    const cfr = new ChangeFailureRate(
      issues,
      releases,
      new Date('2023-04-23T16:50:53Z')
    )

    const bugs = cfr.getBugs()

    expect(bugs.length).toBe(2)
  })

  it('get percentage rate', () => {
    const bugs: Issue[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/issue-list.json', 'utf8')
    )
    const releases: Release[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/releases.json', 'utf8')
    )
    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-23T16:50:53Z')
    )

    const cfrPercentage = cfr.Cfr()

    expect(cfrPercentage).toBe(14)
  })

  it('calculate 0 failures on 0 releases', () => {
    const bugs: Issue[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/issue-list.json', 'utf8')
    )
    const releases: Release[] = []

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 0 failures on 0 issues', () => {
    const bugs: Issue[] = []
    const releases: Release[] = JSON.parse(
      fs.readFileSync('./__tests__/test-data/releases.json', 'utf8')
    )

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 100% failures on 1 issues on 1 release', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        labels: [{ name: 'bug' }],
        repository_url: 'https://api.github.com/repos/stenjo/dora'
      }
    ] as Issue[]

    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/dora/releases/101411508',
        published_at: '2023-04-30T16:50:53Z'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(100)
  })

  it('calculate 0% failures on 1 issues on 1 release when more than a month ago', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        labels: [{ name: 'bug' }],
        repository_url: 'https://api.github.com/repos/stenjo/dora'
      }
    ] as Issue[]

    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/dora/releases/101411508',
        published_at: '2023-04-30T16:50:53Z'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(bugs, releases)

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 0% failures on 1 issues on release on other repo', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        labels: [{ name: 'bug' }],
        repository_url: 'https://api.github.com/repos/stenjo/dora'
      }
    ] as Issue[]

    const releases = [
      {
        url: 'https://api.github.com/repos/stenjo/other-repo/releases/101411508',
        published_at: '2023-04-30T16:50:53Z'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 50% failures on 1 issues on 2 releases', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-30T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-29T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  it('calculate 0% failures on 1 issues that is not a bug on 2 releases', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'feature' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-30T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-29T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(0)
  })

  it('calculate 50% failures on 2 issues after latest release', () => {
    const bugs = [
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-30T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-29T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-04-30T17:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })

  it('calculate 100% failures on 2 issues after no releases this month', () => {
    const bugs = [
      {
        created_at: '2023-04-29T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-31T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-30T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-29T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

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
      {
        created_at: '2023-04-29T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-30T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-29T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

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
      {
        created_at: '2023-04-29T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-28T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-30T19:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-05-02T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

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
      {
        created_at: '2023-04-29T17:50:53Z', // bug on 28, repository
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z', // bug on 20, other-repo
        repository_url: 'somepath/other-repo',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z', // bug on 28, repository
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-28T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-28T16:50:53Z',
        url: 'path/with/other-repo/in/it'
      },
      {
        published_at: '2023-04-30T19:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-05-02T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

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
      {
        created_at: '2023-04-29T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      },
      {
        created_at: '2023-04-30T17:50:53Z',
        repository_url: 'somepath/repository',
        labels: [{ name: 'bug' }]
      }
    ] as Issue[]

    const releases = [
      {
        published_at: '2023-04-28T16:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-30T19:50:53Z',
        url: 'path/with/repository/in/it'
      },
      {
        published_at: '2023-04-02T16:50:53Z',
        url: 'path/with/repository/in/it'
      }
    ] as Release[]

    const cfr = new ChangeFailureRate(
      bugs,
      releases,
      new Date('2023-05-29T10:50:53Z')
    )

    const value = cfr.Cfr()

    expect(value).toBe(50)
  })
})
