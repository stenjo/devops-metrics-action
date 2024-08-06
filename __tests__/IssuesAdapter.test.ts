import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { setFailed } from '@actions/core'
import { IssuesAdapter } from '../src/IssuesAdapter'
import { Issue } from '../src/types/Issue'

const server = setupServer(
  http.get(
    'https://api.github.com/repos/:owner/:rep/issues',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ request, params, cookies }) => {
      const url = new URL(request.url)
      const page = url.searchParams.getAll('page')
      const issues: Issue[] = []
      for (let i = 0; i < (+page < 2 ? 100 : 50); i++) {
        issues.push({ id: i } as Issue)
      }
      return HttpResponse.json(issues)
    }
  )
)
jest.mock('@actions/core', () => ({
  setFailed: jest.fn()
}))

describe('Issue Adapter should', () => {
  beforeEach(() => {
    server.listen()
    jest.clearAllMocks()
  })

  afterAll(() => server.close())

  it('ice breaker', () => {
    expect(true).toBe(true)
  })

  it('return paged values', async () => {
    const r = new IssuesAdapter(undefined, 'test-owner', ['project1'])

    const issues: Issue[] = (await r.GetAllIssuesLastMonth()) as Issue[]

    expect(issues.length).toBe(150)
  })

  it.skip('handles access denied', async () => {
    server.close()
    const errorServer = setupServer(
      http.get(
        'https://api.github.com/repos/:owner/:rep/issues',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ request, params, cookies }) => {
          return new HttpResponse('access denied', { status: 401 })
        }
      )
    )
    errorServer.listen()
    const r = new IssuesAdapter(undefined, 'test-owner', ['project1'])

    expect(async () => await r.GetAllIssuesLastMonth()).toThrow()
    expect(setFailed).toHaveBeenCalledWith('access denied')
    errorServer.close()
  })
})
