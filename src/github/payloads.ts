// Raw GitHub REST payload shapes. Only the mappers in ./mappers.ts should
// consume these; metric classes work on the domain types in ../types.

export interface GitHubPersonPayload {
  login: string
  id: number
  node_id: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
}

export interface GitHubReleasePayload {
  url: string
  uploadUrl: string
  id: number
  author: GitHubPersonPayload
  node_id: string
  tag_name: string
  target_commitish: string
  name: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  assets: unknown[]
  tarball_url: string
  zipball_url: string
  body: string
}

export interface GitHubPullRequestPayload {
  id: number
  number: number
  merged_at: string | null
  base: {
    ref: string
    repo: {
      name: string
    }
  }
  title: string
}

interface GitHubLabelPayload {
  id: number
  node_id: string
  url: string
  name: string
  color: string
  default: boolean
  description: string | null
}

interface GitHubIssuePullRequestPayload {
  url: string
  html_url: string
  diff_url: string
  patch_url: string
  merged_at: string
}

interface GitHubReactionsPayload {
  url: string
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export interface GitHubIssuePayload {
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  id: number
  node_id: string
  number: number
  title: string
  user: GitHubPersonPayload
  labels: GitHubLabelPayload[]
  state: string
  locked: boolean
  assignee: GitHubPersonPayload | null
  assignees: GitHubPersonPayload[]
  milestone: string | null
  comments: number
  created_at: string
  updated_at: string | null
  closed_at: string | null
  author_association: string
  active_lock_reason: string
  draft: boolean
  pull_request: GitHubIssuePullRequestPayload
  body: string
  reactions: GitHubReactionsPayload
  timeline_url: string
  performed_via_github_app: string
  state_reason: string
}

interface GitHubCommitPersonPayload {
  name: string
  email: string
  date: string
}

interface GitHubCommitTreePayload {
  sha: string
  url: string
  html_url: string
}

interface GitHubCommitItemPayload {
  author: GitHubCommitPersonPayload
  committer: GitHubCommitPersonPayload
  message: string
  tree: GitHubCommitTreePayload
  url: string
  comment_count: number
  verification: {
    verified: boolean
    reason: string
    signature: string | null
    payload: string | null
  }
}

export interface GitHubCommitPayload {
  sha: string
  node_id: string
  commit: GitHubCommitItemPayload
  url: string
  html_url: string
  comments_url: string
  author: GitHubPersonPayload
  committer: GitHubPersonPayload
  parents: GitHubCommitTreePayload[]
}
