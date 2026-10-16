// Domain-object builders for metric tests.
import type {Release} from '../../src/types/Release'
import type {PullRequest} from '../../src/types/PullRequest'
import type {Issue} from '../../src/types/Issue'
import type {Commit} from '../../src/types/Commit'
import type {RepoKey} from '../../src/types/RepoKey'

export const ts = (iso: string): number => +new Date(iso)

export function release(
  publishedAt: string,
  repo: RepoKey = 'stenjo/devops-metrics-action',
  name = 'v1.0.0'
): Release {
  return {repo, name, publishedAt: ts(publishedAt)}
}

export function pull(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    repo: 'stenjo/devops-metrics-action',
    number: 47,
    title: 'feat: something',
    mergedAt: ts('2023-04-28T17:50:53Z'),
    baseRef: 'main',
    ...overrides
  }
}

export function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    repo: 'stenjo/devops-metrics-action',
    number: 1,
    title: 'bug: something',
    createdAt: ts('2023-04-22T21:44:06Z'),
    closedAt: ts('2023-04-23T16:47:40Z'),
    labels: ['bug'],
    ...overrides
  }
}

export function commit(committedAt: string, message = 'fix: x'): Commit {
  return {committedAt: ts(committedAt), message}
}
