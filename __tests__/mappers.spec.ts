import {
  repoKey,
  toCommit,
  toIssue,
  toPullRequest,
  toRelease
} from '../src/github/mappers'
import {isoTimestamp} from '../src/types/Timestamp'
import {
  commitPayload,
  issuePayload,
  pullRequestPayload,
  releasePayload
} from './helpers/payloads'

describe('repoKey', () => {
  it('joins owner and repo with a slash, lower-cased', () => {
    expect(repoKey('Stenjo', 'DevOps-Metrics-Action')).toBe(
      'stenjo/devops-metrics-action'
    )
  })

  it('keeps repos whose names are prefixes of each other distinct', () => {
    expect(repoKey('o', 'api')).not.toBe(repoKey('o', 'api-gateway'))
    expect(repoKey('o', 'api')).toBe('o/api')
  })
})

describe('toRelease', () => {
  it('maps name and published_at and keys by owner/repo', () => {
    const release = toRelease(
      'Owner',
      'Repo',
      releasePayload({name: 'v2.0.0', published_at: '2023-04-30T17:50:53Z'})
    )

    expect(release).toEqual({
      repo: 'owner/repo',
      name: 'v2.0.0',
      publishedAt: +new Date('2023-04-30T17:50:53Z')
    })
  })
})

describe('toPullRequest', () => {
  it('maps title, merge time, base ref and commits url', () => {
    const pull = toPullRequest(
      'o',
      'r',
      pullRequestPayload({
        title: 'fix: a',
        merged_at: '2023-04-28T17:50:53Z',
        commits_url: 'https://api/commits',
        base: {ref: 'develop', repo: {name: 'r'}}
      })
    )

    expect(pull).toEqual({
      repo: 'o/r',
      title: 'fix: a',
      mergedAt: +new Date('2023-04-28T17:50:53Z'),
      baseRef: 'develop',
      commitsUrl: 'https://api/commits'
    })
  })

  it('maps an unmerged pull to mergedAt null', () => {
    expect(
      toPullRequest('o', 'r', pullRequestPayload({merged_at: null})).mergedAt
    ).toBeNull()
    expect(
      toPullRequest('o', 'r', pullRequestPayload({merged_at: ''})).mergedAt
    ).toBeNull()
  })
})

describe('toIssue', () => {
  it('maps created/closed times and flattens label names', () => {
    const issue = toIssue(
      'o',
      'r',
      issuePayload({
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{name: 'bug'}, {name: 'p1'}] as never
      })
    )

    expect(issue).toEqual({
      repo: 'o/r',
      createdAt: +new Date('2023-04-22T21:44:06Z'),
      closedAt: +new Date('2023-04-23T16:47:40Z'),
      labels: ['bug', 'p1']
    })
  })

  it('maps an open issue to closedAt null', () => {
    expect(
      toIssue('o', 'r', issuePayload({closed_at: null})).closedAt
    ).toBeNull()
  })
})

describe('toCommit', () => {
  it('maps committer date and message', () => {
    expect(toCommit(commitPayload('2023-04-22T20:41:12Z', 'fix: it'))).toEqual({
      committedAt: +new Date('2023-04-22T20:41:12Z'),
      message: 'fix: it'
    })
  })
})

describe('isoTimestamp', () => {
  it('renders epoch milliseconds as GitHub-style second-precision ISO', () => {
    expect(isoTimestamp(+new Date('2023-04-22T20:28:29Z'))).toBe(
      '2023-04-22T20:28:29Z'
    )
    expect(isoTimestamp(+new Date('2023-04-22T20:28:29.500Z'))).toBe(
      '2023-04-22T20:28:29Z'
    )
  })
})
