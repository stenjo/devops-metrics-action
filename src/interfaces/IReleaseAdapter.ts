import { Release } from '../types/Release'

export interface IReleaseAdapter {
  today: Date
  GetAllReleasesLastMonth(): Promise<Release[] | undefined>
}
