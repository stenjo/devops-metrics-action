import {Octokit} from '@octokit/core'

export interface GitHubClientOptions {
  token?: string
  baseUrl?: string
}

export type RequestParams = Record<string, unknown>

export interface PaginateOptions<T> {
  // Stop paging at the first item matching; that item and the rest are dropped.
  until?: (item: T) => boolean
}

// Stable, URL/body-free failure message; the raw Octokit error is kept as `cause`.
export class GitHubApiError extends Error {
  readonly status: number | undefined
  readonly route: string

  constructor(route: string, cause: unknown) {
    const status =
      typeof (cause as {status?: unknown})?.status === 'number'
        ? (cause as {status: number}).status
        : undefined
    super(`GitHub API request failed (${status ?? 'unknown'}) for ${route}`, {
      cause
    })
    this.name = 'GitHubApiError'
    this.status = status
    this.route = route
  }
}

export class GitHubClient {
  readonly octokit: Octokit

  constructor(options: GitHubClientOptions = {}) {
    this.octokit = new Octokit({
      auth: options.token,
      ...(options.baseUrl !== undefined && {baseUrl: options.baseUrl})
    })
  }

  async request<T>(route: string, params: RequestParams = {}): Promise<T> {
    try {
      const result = await this.octokit.request(route, {
        ...params,
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
      return result.data as T
    } catch (e: unknown) {
      throw new GitHubApiError(route, e)
    }
  }

  async paginate<T>(
    route: string,
    params: RequestParams = {},
    options: PaginateOptions<T> = {}
  ): Promise<T[]> {
    const perPage = 100
    const maxPages = 99
    let result: T[] = []
    for (let page = 1; page <= maxPages; page++) {
      const items = await this.request<T[]>(route, {
        ...params,
        per_page: perPage,
        page
      })
      const stopAt = options.until ? items.findIndex(options.until) : -1
      if (stopAt >= 0) {
        return result.concat(items.slice(0, stopAt))
      }
      result = result.concat(items)
      if (items.length < perPage) {
        break
      }
    }
    return result
  }
}
