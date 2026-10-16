import {Octokit} from '@octokit/core'
import {throttling} from '@octokit/plugin-throttling'
import type {ThrottlingOptions} from '@octokit/plugin-throttling'
import {retry} from '@octokit/plugin-retry'
import type {Logger} from './types/Logger'

export interface GitHubClientOptions {
  token?: string
  baseUrl?: string
  logger?: Pick<Logger, 'warning'>
}

export interface ClientLimits {
  perPage: number
  maxPages: number
}

// A function rather than constants so the values are not static mutants for Stryker.
export function defaultClientLimits(): ClientLimits {
  return {perPage: 100, maxPages: 99}
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
  readonly limits: ClientLimits
  // Last `x-ratelimit-remaining` seen on any response; undefined until one arrives.
  rateLimitRemaining: number | undefined
  private readonly logger: Pick<Logger, 'warning'>

  constructor(
    options: GitHubClientOptions = {},
    limits: ClientLimits = defaultClientLimits()
  ) {
    this.logger = options.logger ?? {warning: () => undefined}
    this.limits = limits
    const ThrottledOctokit = Octokit.plugin(throttling, retry)
    const throttle: ThrottlingOptions = {
      // Primary limit: wait for the reset once, then give up.
      onRateLimit: (retryAfter, request, _octokit, retryCount) => {
        const retrying = retryCount < 1
        this.logger.warning(
          `GitHub API rate limit exhausted for ${request.method} ${request.url}; ${
            retrying ? `retrying in ${retryAfter.toString()}s` : 'giving up'
          }`
        )
        return retrying
      },
      // Secondary (abuse) limit: back off entirely rather than hammer the API.
      onSecondaryRateLimit: (_retryAfter, request) => {
        this.logger.warning(
          `GitHub API secondary rate limit hit for ${request.method} ${request.url}; not retrying`
        )
        return false
      }
    }
    this.octokit = new ThrottledOctokit({
      auth: options.token,
      ...(options.baseUrl !== undefined && {baseUrl: options.baseUrl}),
      throttle
    })
  }

  // Only `METHOD /path` route templates are accepted, so the token can never
  // be sent to a host chosen by a URL found in response data.
  async request<T>(route: string, params: RequestParams = {}): Promise<T> {
    if (!/^[A-Z]+ \//.test(route)) {
      throw new TypeError(`Refusing to request a non-route URL: ${route}`)
    }
    try {
      const result = await this.octokit.request(route, {
        ...params,
        headers: {'X-GitHub-Api-Version': '2022-11-28'}
      })
      this.recordRateLimit(result.headers)
      return result.data as T
    } catch (e: unknown) {
      throw new GitHubApiError(route, e)
    }
  }

  private recordRateLimit(headers: Record<string, unknown> | undefined): void {
    const remaining = headers?.['x-ratelimit-remaining']
    if (typeof remaining === 'string' && /^\d+$/.test(remaining)) {
      this.rateLimitRemaining = Number(remaining)
    }
  }

  async paginate<T>(
    route: string,
    params: RequestParams = {},
    options: PaginateOptions<T> = {}
  ): Promise<T[]> {
    const {perPage, maxPages} = this.limits
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
        return result
      }
    }
    this.logger.warning(
      `Stopped paging ${route} after ${maxPages.toString()} pages (${result.length.toString()} items); results may be incomplete`
    )
    return result
  }
}
