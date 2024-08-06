import { Person } from './Person'

interface CommitPerson {
  name: string // "Sten Otto Johnsen",
  email: string // "steoj@equinor.com",
  date: string // "2023-04-22T20:41:12Z"
}

interface CommitTree {
  sha: string // "4f5618f8703c4dd70b5465590125bd238b88103f",
  url: string // "https://api.github.com/repos/stenjo/dora/git/trees/4f5618f8703c4dd70b5465590125bd238b88103f"
  html_url: string // "https://api.github.com/repos/stenjo/dora/git/trees/4f5618f8703c4dd70b5465590125bd238b88103f"
}
interface CommitItem {
  author: CommitPerson
  committer: CommitPerson
  message: string // "fix: clean up",
  tree: CommitTree
  url: string // "https://api.github.com/repos/stenjo/dora/git/commits/5265568661241b8be64cf7df2ea455ba736908ee",
  comment_count: number
  verification: {
    verified: boolean // false,
    reason: string // "unsigned",
    signature: string | null
    payload: string | null
  }
}

export interface Commit {
  sha: string // "5265568661241b8be64cf7df2ea455ba736908ee",
  node_id: string // "C_kwDOJTf0atoAKDUyNjU1Njg2NjEyNDFiOGJlNjRjZjdkZjJlYTQ1NWJhNzM2OTA4ZWU",
  commit: CommitItem
  url: string // "https://api.github.com/repos/stenjo/dora/commits/5265568661241b8be64cf7df2ea455ba736908ee",
  html_url: string // "https://github.com/stenjo/dora/commit/5265568661241b8be64cf7df2ea455ba736908ee",
  comments_url: string // "https://api.github.com/repos/stenjo/dora/commits/5265568661241b8be64cf7df2ea455ba736908ee/comments",
  author: Person
  committer: Person
  parents: CommitTree[]
}
