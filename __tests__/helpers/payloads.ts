// Minimal GitHub payload stubs for adapter tests. Only the fields the
// mappers read are populated.
import type {
  GitHubCommitPayload,
  GitHubIssuePayload,
  GitHubPullRequestPayload,
  GitHubReleasePayload
} from '../../src/github/payloads'

export function releasePayload(
  overrides: Partial<GitHubReleasePayload> = {}
): GitHubReleasePayload {
  return {
    name: 'v1.0.0',
    published_at: '2023-04-30T17:50:53Z',
    ...overrides
  } as GitHubReleasePayload
}

export function pullRequestPayload(
  overrides: Partial<GitHubPullRequestPayload> = {}
): GitHubPullRequestPayload {
  return {
    number: 1,
    title: 'feat: something',
    merged_at: '2023-04-28T17:50:53Z',
    base: {ref: 'main', repo: {name: 'r'}},
    ...overrides
  } as GitHubPullRequestPayload
}

export function issuePayload(
  overrides: Partial<GitHubIssuePayload> = {}
): GitHubIssuePayload {
  return {
    created_at: '2023-04-22T21:44:06Z',
    closed_at: '2023-04-23T16:47:40Z',
    labels: [],
    ...overrides
  } as GitHubIssuePayload
}

export function commitPayload(
  date = '2023-04-22T17:50:53Z',
  message = 'fix: x'
): GitHubCommitPayload {
  return {
    commit: {committer: {date}, message}
  } as GitHubCommitPayload
}
