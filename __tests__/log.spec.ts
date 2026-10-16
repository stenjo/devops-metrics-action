import {defaultLogLimits, serializeLog} from '../src/log'
import type {LogEntry, PullLogEntry} from '../src/types/LogEntry'
import {LeadTime} from '../src/LeadTime'
import {DeployFrequency} from '../src/DeployFrequency'
import {toCommit, toPullRequest, toRelease} from '../src/github/mappers'
import type {ICommitsAdapter} from '../src/interfaces/ICommitsAdapter'
import type {Commit} from '../src/types/Commit'
import {pull, release} from './helpers/domain'
import {
  commitPayload,
  pullRequestPayload,
  releasePayload
} from './helpers/payloads'

const INJECTION = '`id` ${{ github.token }} $(rm -rf /)\necho pwned'
const UNSAFE = /[`\n\r]|\$\{|\$\(/

function releaseEntry(i: number): LogEntry {
  return {
    kind: 'release',
    repo: 'o/r',
    at: '2023-04-22T20:28:29Z',
    name: `v${i}`
  }
}

function stringFields(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringFields)
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(stringFields)
  return []
}

describe('serializeLog', () => {
  it('renders an empty log as an empty JSON array', () => {
    expect(serializeLog([])).toBe('[]')
  })

  it('renders every entry when under the caps, with no truncated marker', () => {
    const entries = [releaseEntry(1), releaseEntry(2)]

    const out = serializeLog(entries)

    expect(out).toBe(JSON.stringify(entries))
    expect(JSON.parse(out)).toEqual(entries)
  })

  it('defaults to 500 entries and just under 1 MiB', () => {
    expect(defaultLogLimits()).toEqual({maxEntries: 500, maxBytes: 1047552})
  })

  it('caps the entry count and appends a truncated record with the omitted count', () => {
    const entries = Array.from({length: 1000}, (_, i) => releaseEntry(i))

    const parsed = JSON.parse(serializeLog(entries)) as LogEntry[]

    expect(parsed).toHaveLength(501)
    expect(parsed.slice(0, 500)).toEqual(entries.slice(0, 500))
    expect(parsed[500]).toEqual({kind: 'truncated', omitted: 500})
  })

  it('keeps exactly maxEntries when the input has exactly that many', () => {
    const entries = Array.from({length: 3}, (_, i) => releaseEntry(i))

    const parsed = JSON.parse(
      serializeLog(entries, {maxEntries: 3, maxBytes: 10_000})
    ) as LogEntry[]

    expect(parsed).toEqual(entries)
  })

  it('caps the serialized byte size before the entry count is reached', () => {
    const entries = Array.from({length: 10}, (_, i) => releaseEntry(i))
    const one = JSON.stringify(releaseEntry(0)).length
    // A fourth entry fits only if the three separating commas are not counted.
    const maxBytes = 4 * one + 67

    const out = serializeLog(entries, {maxEntries: 100, maxBytes})
    const parsed = JSON.parse(out) as LogEntry[]

    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(maxBytes)
    expect(parsed).toHaveLength(4)
    expect(parsed.slice(0, 3)).toEqual(entries.slice(0, 3))
    expect(parsed[3]).toEqual({kind: 'truncated', omitted: 7})
  })

  it('keeps an entry that fits exactly against the byte cap', () => {
    const entries = Array.from({length: 3}, (_, i) => releaseEntry(i))
    const one = JSON.stringify(releaseEntry(0)).length
    // Brackets + three entries + two commas + the 64-byte truncated reserve.
    const maxBytes = 2 + 3 * one + 2 + 64

    const parsed = JSON.parse(
      serializeLog(entries, {maxEntries: 100, maxBytes})
    ) as LogEntry[]

    expect(parsed).toEqual(entries)
  })

  it('measures multi-byte characters in bytes, not code units', () => {
    const wide: LogEntry = {
      kind: 'release',
      repo: 'o/r',
      at: 'x',
      name: '€€€€€€€€€€'
    }
    const bytes = Buffer.byteLength(JSON.stringify(wide))
    const chars = JSON.stringify(wide).length
    expect(bytes).toBeGreaterThan(chars)

    const parsed = JSON.parse(
      serializeLog([wide, wide], {maxEntries: 10, maxBytes: 2 + chars + 64})
    ) as LogEntry[]

    expect(parsed).toEqual([{kind: 'truncated', omitted: 2}])
  })

  it('never exceeds the default byte cap for 1,000 maximal pull records', () => {
    const big: PullLogEntry = {
      kind: 'pull',
      repo: `${'O'.repeat(100)}/${'R'.repeat(100)}`,
      at: '2023-04-28T17:50:53Z',
      title: 'T'.repeat(200),
      commitAt: '2023-04-20T00:00:00Z',
      commitMessage: 'M'.repeat(200),
      releaseAt: '2023-04-30T17:50:53Z',
      release: 'R'.repeat(200),
      leadTimeDays: 10.74
    }
    const entries = Array.from({length: 1000}, () => big)

    const out = serializeLog(entries)

    expect(Buffer.byteLength(out)).toBeLessThan(1024 * 1024)
    expect(JSON.parse(out)).toHaveLength(501)
  })
})

describe('log outputs end to end', () => {
  const commits: ICommitsAdapter = {
    getCommits: async (): Promise<Commit[]> => [
      toCommit(commitPayload('2023-04-20T00:00:00Z', INJECTION))
    ]
  }
  const today = new Date('2023-05-01T00:00:00Z')

  it('emits a lead-time log an attacker cannot break out of', async () => {
    const pulls = [
      toPullRequest('o', 'r', pullRequestPayload({title: INJECTION}))
    ]
    const releases = [toRelease('o', 'r', releasePayload({name: INJECTION}))]
    const lt = new LeadTime(pulls, releases, commits, today)
    await lt.getLeadTime()

    const out = serializeLog(lt.getLog())
    const parsed = JSON.parse(out) as PullLogEntry[]

    expect(parsed).toHaveLength(1)
    expect(parsed[0].kind).toBe('pull')
    expect(parsed[0].title).toBe('id {{ github.token }} (rm -rf /) echo pwned')
    for (const field of stringFields(parsed)) {
      expect(field).not.toMatch(UNSAFE)
    }
    expect(out).not.toMatch(/[`\n\r]|\$\{|\$\(/)
  })

  it('emits a deploy-rate log an attacker cannot break out of', () => {
    const releases = [
      toRelease(
        'o',
        'r',
        releasePayload({name: INJECTION, published_at: '2023-04-30T17:50:53Z'})
      )
    ]
    const df = new DeployFrequency(releases, '2023-05-01T00:00:00Z')
    df.rate()

    const out = serializeLog(df.getLog())
    const parsed = JSON.parse(out) as LogEntry[]

    expect(parsed).toEqual([
      {
        kind: 'release',
        repo: 'o/r',
        at: '2023-04-30T17:50:53Z',
        name: 'id {{ github.token }} (rm -rf /) echo pwned'
      }
    ])
    expect(out).not.toMatch(/[`\n\r]|\$\{|\$\(/)
  })

  it('bounds the lead-time log for 1,000 pull requests', async () => {
    const pulls = Array.from({length: 1000}, (_, i) =>
      pull({title: `feat: change ${i.toString()}`})
    )
    const lt = new LeadTime(
      pulls,
      [release('2023-04-30T17:50:53Z')],
      commits,
      today,
      undefined,
      {maxCommitFetches: 1000, concurrency: 4}
    )
    await lt.getLeadTime()

    const out = serializeLog(lt.getLog())
    const parsed = JSON.parse(out) as LogEntry[]

    expect(lt.getLog()).toHaveLength(1000)
    expect(parsed).toHaveLength(501)
    expect(parsed[0]).toMatchObject({kind: 'pull', title: 'feat: change 0'})
    expect(parsed[500]).toEqual({kind: 'truncated', omitted: 500})
    expect(Buffer.byteLength(out)).toBeLessThan(1024 * 1024)
  })
})
