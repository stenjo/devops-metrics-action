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

  it('sanitizes the release name', () => {
    expect(
      toRelease('o', 'r', releasePayload({name: ' v1\n`x` ${a} '})).name
    ).toBe('v1 x {a}')
    expect(
      toRelease('o', 'r', releasePayload({name: null as unknown as string}))
        .name
    ).toBe('')
  })
})

describe('toPullRequest', () => {
  it('maps number, title, merge time and base ref', () => {
    const pull = toPullRequest(
      'o',
      'r',
      pullRequestPayload({
        number: 7,
        title: 'fix: a',
        merged_at: '2023-04-28T17:50:53Z',
        base: {ref: 'develop', repo: {name: 'r'}}
      })
    )

    expect(pull).toEqual({
      repo: 'o/r',
      number: 7,
      title: 'fix: a',
      mergedAt: +new Date('2023-04-28T17:50:53Z'),
      baseRef: 'develop'
    })
  })

  it('does not carry response URLs into the domain object', () => {
    const payload = {
      ...pullRequestPayload(),
      commits_url: 'https://evil.example/repos/o/r/pulls/1/commits'
    }

    expect(JSON.stringify(toPullRequest('o', 'r', payload))).not.toContain(
      'evil.example'
    )
  })

  it('maps an unmerged pull to mergedAt null', () => {
    expect(
      toPullRequest('o', 'r', pullRequestPayload({merged_at: null})).mergedAt
    ).toBeNull()
    expect(
      toPullRequest('o', 'r', pullRequestPayload({merged_at: ''})).mergedAt
    ).toBeNull()
  })

  it('sanitizes and truncates the title', () => {
    const title = `fix:\t${'a'.repeat(300)}`

    const mapped = toPullRequest('o', 'r', pullRequestPayload({title})).title

    expect(mapped).toHaveLength(200)
    expect(mapped.startsWith('fix: aaa')).toBe(true)
    expect(mapped.endsWith('…')).toBe(true)
  })
})

describe('toIssue', () => {
  it('maps number, title, created/closed times and flattens label names', () => {
    const issue = toIssue(
      'o',
      'r',
      issuePayload({
        number: 42,
        title: 'bug: it breaks',
        created_at: '2023-04-22T21:44:06Z',
        closed_at: '2023-04-23T16:47:40Z',
        labels: [{name: 'bug'}, {name: 'p1'}] as never
      })
    )

    expect(issue).toEqual({
      repo: 'o/r',
      number: 42,
      title: 'bug: it breaks',
      createdAt: +new Date('2023-04-22T21:44:06Z'),
      closedAt: +new Date('2023-04-23T16:47:40Z'),
      labels: ['bug', 'p1']
    })
  })

  it('sanitizes the title', () => {
    expect(
      toIssue('o', 'r', issuePayload({title: 'bug: `rm`\n$(x) ${y}'})).title
    ).toBe('bug: rm (x) {y}')
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

  it('flattens a multi-line commit message to its sanitized single line', () => {
    expect(
      toCommit(commitPayload('2023-04-22T20:41:12Z', 'fix: it\n\nBody `$(x)`'))
        .message
    ).toBe('fix: it Body (x)')
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
