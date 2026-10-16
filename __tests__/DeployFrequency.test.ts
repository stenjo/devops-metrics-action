//
import {DeployFrequency} from '../src/DeployFrequency'
import fs from 'node:fs'
import type {Release} from '../src/types/Release'
import type {GitHubReleasePayload} from '../src/github/payloads'
import {toRelease} from '../src/github/mappers'

function loadReleases(file: string, repo: string): Release[] {
  return (
    JSON.parse(fs.readFileSync(file, 'utf-8')) as GitHubReleasePayload[]
  ).map(p => toRelease('stenjo', repo, p))
}

describe('Deploy frequency should', () => {
  // Release v0.0.1:2023-04-14, v0.0.2:2023-04-22
  const releaseList2: Release[] = loadReleases(
    './__tests__/test-data/one-release.json',
    'dora'
  )
  // Release
  // v0.0.1:2023-04-12, v0.0.2:2023-04-22, v0.1.0:2023-04-29,
  // v0.2.0:2023-04-30, v0.2.1:2023-04-30, v0.3.0-beta:2023-04-30,
  // v0.3.1-beta:2023-04-30
  const releaseList7: Release[] = loadReleases(
    './__tests__/test-data/releases.json',
    'devops-metrics-action'
  )
  it('calculate releases pr week for release less than 1 week', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-14T22:33:11Z')
    const wr = df.weekly()

    expect(wr).toBe(1)
  })
  it('calculate releases pr week for release more than 1 week ago', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-24T22:33:11Z')
    const wr = df.weekly()

    expect(wr).toBe(1)
  })
  it('calculate releases pr week for release this week based on large list', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-01T22:33:11Z')
    const wr = df.weekly()

    expect(wr).toBe(5)
  })
  it('monthly calculate releases pr week for release more than 1 week ago', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-24T22:33:11Z')
    const mr = df.monthly()

    expect(mr).toBe(2)
  })
  it('calculate release rate last month', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-14T22:33:11Z')
    const rr = df.rate()

    expect(rr).toBe('0.47')
  })
  it('calculate release rate last month based on 7 releases list', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-14T22:33:11Z')
    const rr = df.rate()

    expect(rr).toBe('1.40')
  })
  it('calculate release rate next month', () => {
    const df = new DeployFrequency(releaseList2, '2023-05-23T22:33:11Z')
    const rr = df.rate()

    expect(rr).toBe('0.00')
  })
  it('throw exception when no releases', () => {
    const emptyReleaseList: Release[] = []

    const t = (): void => {
      new DeployFrequency(emptyReleaseList)
    }

    expect(t).toThrow('Empty release list')
  })
  it('throw exception when release list is null', () => {
    const emptyReleaseList: Release[] | null = null

    const t = (): void => {
      new DeployFrequency(emptyReleaseList)
    }

    expect(t).toThrow('Empty release list')
  })
  it('get an empty log of releases', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-14T22:33:11Z')

    expect(df.getLog().length).toBe(0)
  })

  it('get release log list weekly when rate calculated', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-01T22:33:11Z')

    df.weekly()

    expect(df.getLog().filter(l => l.kind === 'release').length).toBe(5)
  })

  it('get release log list monthly when rate calculated', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-14T22:33:11Z')

    df.monthly()

    expect(df.getLog().filter(l => l.kind === 'release').length).toBe(6)
  })

  it('get release log list when rate calculated', () => {
    const df = new DeployFrequency(releaseList7, '2023-05-14T22:33:11Z')

    df.rate()

    expect(df.getLog().filter(l => l.kind === 'release').length).toBe(6)
  })

  it('log release name and date weekly', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-23T22:33:11Z')

    df.weekly()

    expect(df.getLog()).toEqual([
      {
        kind: 'release',
        repo: 'stenjo/dora',
        at: '2023-04-22T20:28:29Z',
        name: 'v0.0.2'
      }
    ])
  })

  it('log release name and date monthly', () => {
    const df = new DeployFrequency(releaseList2, '2023-04-23T22:33:11Z')

    df.monthly()

    expect(df.getLog()).toEqual([
      {
        kind: 'release',
        repo: 'stenjo/dora',
        at: '2023-04-22T20:28:29Z',
        name: 'v0.0.2'
      },
      {
        kind: 'release',
        repo: 'stenjo/dora',
        at: '2023-04-12T22:33:24Z',
        name: 'v0.0.1'
      }
    ])
  })
})
