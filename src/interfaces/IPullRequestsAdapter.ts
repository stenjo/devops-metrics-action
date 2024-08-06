import { PullRequest } from '../types/PullRequest'

export interface IPullRequestsAdapter {
  GetAllPRsLastMonth(): Promise<PullRequest[] | undefined>
}
