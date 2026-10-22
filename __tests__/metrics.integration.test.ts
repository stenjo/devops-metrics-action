import {GitHubClient} from '../src/GitHubClient'
import {run} from '../src/main'
import type {Inputs} from '../src/main'
import type {GitHubIssuePayload} from '../src/github/payloads'
import {
  commitPayload,
  issuePayload,
  pullRequestPayload,
  releasePayload
} from './helpers/payloads'

const NOW = new Date('2024-05-01T00:00:00Z')
const OWNER = 'stenjo'
const REPOSITORY = 'metrics-fixture'
const REPO_KEY = `${OWNER}/${REPOSITORY}`

const releases = [
  releasePayload({name: 'v3.0.0', published_at: '2024-04-30T00:00:00Z'}),
  releasePayload({name: 'v2.0.0', published_at: '2024-04-25T00:00:00Z'}),
  releasePayload({name: 'v1.0.0', published_at: '2024-04-15T00:00:00Z'})
]

const pulls = [
  pullRequestPayload({
    number: 7,
    title: 'feat: report metrics',
    merged_at: '2024-04-10T00:00:00Z',
    updated_at: '2024-04-10T00:00:00Z'
  })
]

const issues = [
  issuePayload({
    number: 42,
    title: 'production incident',
    created_at: '2024-04-16T00:00:00Z',
    closed_at: '2024-04-18T00:00:00Z',
    updated_at: '2024-04-18T00:00:00Z',
    labels: [{name: 'bug'} as GitHubIssuePayload['labels'][number]]
  })
]

const commits = [commitPayload('2024-04-08T00:00:00Z', 'feat: report metrics')]

const inputs: Inputs = {
  owner: OWNER,
  repositories: [REPOSITORY],
  token: 'test-token',
  logging: true,
  filtered: false,
  bugLabel: 'bug'
}

describe('metrics integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes exact action outputs from GitHub API payloads', async () => {
    const client = new GitHubClient()
    const requestedRoutes: string[] = []
    vi.spyOn(client, 'request').mockImplementation(
      async <T>(route: string): Promise<T> => {
        requestedRoutes.push(route)
        switch (route) {
          case 'GET /repos/{owner}/{repo}/releases':
            return releases as T
          case 'GET /repos/{owner}/{repo}/pulls':
            return pulls as T
          case 'GET /repos/{owner}/{repo}/issues':
            return issues as T
          case 'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits':
            return commits as T
          default:
            throw new Error(`Unexpected GitHub API route: ${route}`)
        }
      }
    )
    const core = {
      info: vi.fn(),
      warning: vi.fn(),
      setOutput: vi.fn()
    }

    const outputs = await run({inputs, client, core})

    expect(outputs).toEqual({
      'deploy-rate': '0.70',
      'deploy-rate-log': JSON.stringify([
        {
          kind: 'release',
          repo: REPO_KEY,
          at: '2024-04-15T00:00:00Z',
          name: 'v1.0.0'
        },
        {
          kind: 'release',
          repo: REPO_KEY,
          at: '2024-04-25T00:00:00Z',
          name: 'v2.0.0'
        },
        {
          kind: 'release',
          repo: REPO_KEY,
          at: '2024-04-30T00:00:00Z',
          name: 'v3.0.0'
        }
      ]),
      'lead-time': 7,
      'lead-time-log': JSON.stringify([
        {
          kind: 'pull',
          repo: REPO_KEY,
          at: '2024-04-10T00:00:00Z',
          title: 'feat: report metrics',
          commitAt: '2024-04-08T00:00:00Z',
          commitMessage: 'feat: report metrics',
          releaseAt: '2024-04-15T00:00:00Z',
          release: 'v1.0.0',
          leadTimeDays: 7
        }
      ]),
      'change-failure-rate': 33,
      'change-failure-rate-log': JSON.stringify([
        {
          kind: 'failed-release',
          repo: REPO_KEY,
          at: '2024-04-15T00:00:00Z',
          name: 'v1.0.0',
          bugs: [
            {
              number: 42,
              title: 'production incident',
              createdAt: '2024-04-16T00:00:00Z'
            }
          ]
        }
      ]),
      mttr: 10,
      'mttr-log': JSON.stringify([
        {
          kind: 'restore',
          repo: REPO_KEY,
          number: 42,
          title: 'production incident',
          createdAt: '2024-04-16T00:00:00Z',
          closedAt: '2024-04-18T00:00:00Z',
          releaseBefore: 'v1.0.0',
          releaseBeforeAt: '2024-04-15T00:00:00Z',
          releaseAfter: 'v2.0.0',
          releaseAfterAt: '2024-04-25T00:00:00Z',
          restoreDays: 10
        }
      ]),
      'metrics-status':
        '{"deploy-rate":"computed","lead-time":"computed","change-failure-rate":"computed","mttr":"computed"}'
    })
    expect(requestedRoutes).toHaveLength(4)
    expect(core.setOutput.mock.calls).toEqual(Object.entries(outputs))
  })
})
