import {Release} from '../types/Release'

export interface IReleaseAdapter {
  GetAllReleasesLastMonth(): Promise<Release[]>
}
