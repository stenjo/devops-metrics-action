import { Person } from './Person'

interface Label {
  id: number // 5382688746,
  node_id: string // "LA_kwDOJTf0as8AAAABQNVP6g",
  url: string //  "https://api.github.com/repos/stenjo/dora/labels/autorelease:%20pending",
  name: string //  "autorelease: pending",
  color: string //  "ededed",
  default: boolean // false,
  description: string | null
}

interface PullRequest {
  url: string //  "https://api.github.com/repos/stenjo/dora/pulls/13",
  html_url: string //  "https://github.com/stenjo/dora/pull/13",
  diff_url: string //  "https://github.com/stenjo/dora/pull/13.diff",
  patch_url: string //  "https://github.com/stenjo/dora/pull/13.patch",
  merged_at: string //  null;
}

interface Reactions {
  url: string //  "https://api.github.com/repos/stenjo/dora/issues/13/reactions",
  total_count: number // 0,
  '+1': number // 0,
  '-1': number // 0,
  laugh: number // 0,
  hooray: number // 0,
  confused: number // 0,
  heart: number // 0,
  rocket: number // 0,
  eyes: number // 0
}

export interface Issue {
  url: string // "https://api.github.com/repos/stenjo/dora/issues/13",
  repository_url: string // "https://api.github.com/repos/stenjo/dora",
  labels_url: string //  "https://api.github.com/repos/stenjo/dora/issues/13/labels{/name}",
  comments_url: string //  "https://api.github.com/repos/stenjo/dora/issues/13/comments",
  events_url: string //  "https://api.github.com/repos/stenjo/dora/issues/13/events",
  html_url: string //  "https://github.com/stenjo/dora/pull/13",
  id: number // 1679712935,
  node_id: string //  "PR_kwDOJTf0as5O7IME",
  number: number // 13,
  title: string // "chore(main): release 0.0.3",
  user: Person
  labels: Label[]
  state: string //  "open",
  locked: boolean // false,
  assignee: Person | null
  assignees: Person[]
  milestone: string | null
  comments: number // 0,
  created_at: string //  "2023-04-22T20:51:14Z",
  updated_at: string | null //  "2023-04-22T20:51:15Z",
  closed_at: string | null
  author_association: string //  "CONTRIBUTOR",
  active_lock_reason: string //  null,
  draft: boolean // false,
  pull_request: PullRequest
  body: string //  ":robot: I have created a release *beep* *boop*\n---\n\n\n## [0.0.3](https://github.com/stenjo/dora/compare/v0.0.2...v0.0.3) (2023-04-22)\n\n\n### Bug Fixes\n\n* clean up ([5265568](https://github.com/stenjo/dora/commit/5265568661241b8be64cf7df2ea455ba736908ee))\n\n---\nThis PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).",
  reactions: Reactions
  timeline_url: string //  "https://api.github.com/repos/stenjo/dora/issues/13/timeline",
  performed_via_github_app: string //  null,
  state_reason: string //  null
}
