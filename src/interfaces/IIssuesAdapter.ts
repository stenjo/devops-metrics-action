import { Issue } from '../types/Issue'

export interface IIssuesAdapter {
  today: Date
  GetAllIssuesLastMonth(): Promise<Issue[] | undefined>
}
