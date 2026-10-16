import type {RepoKey} from '../types/RepoKey'
import type {Release} from '../types/Release'
import type {PullRequest} from '../types/PullRequest'
import type {Issue} from '../types/Issue'
import type {Commit} from '../types/Commit'
import type {
  GitHubCommitPayload,
  GitHubIssuePayload,
  GitHubPullRequestPayload,
  GitHubReleasePayload
} from './payloads'
import {sanitizeText} from '../sanitize'

export function repoKey(owner: string, repo: string): RepoKey {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`
}

function timestamp(value: string | null): number | null {
  return value ? +new Date(value) : null
}

export function toRelease(
  owner: string,
  repo: string,
  payload: GitHubReleasePayload
): Release {
  return {
    repo: repoKey(owner, repo),
    name: sanitizeText(payload.name),
    publishedAt: +new Date(payload.published_at)
  }
}

export function toPullRequest(
  owner: string,
  repo: string,
  payload: GitHubPullRequestPayload
): PullRequest {
  return {
    repo: repoKey(owner, repo),
    number: payload.number,
    title: sanitizeText(payload.title),
    mergedAt: timestamp(payload.merged_at),
    baseRef: payload.base.ref
  }
}

export function toIssue(
  owner: string,
  repo: string,
  payload: GitHubIssuePayload
): Issue {
  return {
    repo: repoKey(owner, repo),
    createdAt: +new Date(payload.created_at),
    closedAt: timestamp(payload.closed_at),
    labels: payload.labels.map(label => label.name)
  }
}

export function toCommit(payload: GitHubCommitPayload): Commit {
  return {
    committedAt: +new Date(payload.commit.committer.date),
    message: sanitizeText(payload.commit.message)
  }
}
