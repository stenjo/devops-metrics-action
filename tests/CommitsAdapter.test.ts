import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'
import {setFailed} from '@actions/core'
import {CommitsAdapter} from '../src/CommitsAdapter'
import fs from 'node:fs'
import type {Commit} from '../src/types/Commit'

const commitsUrl =
  'https://api.github.com/repos/stenjo/devops-metrics-action/pulls/69/commits'
const server = setupServer(
  http.get(
    commitsUrl,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({request, params, cookies}) => {
      const commits: Commit[] = JSON.parse(
        fs.readFileSync('./tests/test-data/commits.json').toString()
      ) as Commit[]
      return HttpResponse.json(commits)
    }
  )
)
jest.mock('@actions/core', () => ({
  setFailed: jest.fn()
}))

describe('Commit Adapter should', () => {
  beforeEach(() => {
    server.listen()
    jest.clearAllMocks()
  })

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return unpaged values', async () => {
    const r = new CommitsAdapter(undefined)

    const releases: Commit[] = (await r.getCommitsFromUrl(
      commitsUrl
    )) as Commit[]

    expect(releases.length).toBe(30)
  })

  it('handles access denied', async () => {
    server.close()
    const errorServer = setupServer(
      http.get(
        commitsUrl,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({request, params, cookies}) => {
          return new HttpResponse('Bad credentials', {status: 401})
        }
      )
    )
    errorServer.listen()
    const r = new CommitsAdapter(commitsUrl)

    expect(await r.getCommitsFromUrl(commitsUrl)).toThrowError
    expect(setFailed).toHaveBeenCalledWith('Bad credentials')
    errorServer.close()
  })
})
