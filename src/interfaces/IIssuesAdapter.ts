import {Issue} from '../types/Issue'

export interface IIssuesAdapter {
  GetAllIssuesLastMonth(): Promise<Issue[]>
}
