# Get DevOps Metrics from GitHub project issues and releases

[![CodeQL](https://github.com/stenjo/devops-metrics-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/stenjo/devops-metrics-action/actions/workflows/codeql-analysis.yml)
[![units-test](https://github.com/stenjo/devops-metrics-action/actions/workflows/test.yml/badge.svg)](https://github.com/stenjo/devops-metrics-action/actions/workflows/test.yml)
![Coverage Badge](badges/coverage.svg)
![Stryker-JS](badges/stryker.svg)

This GitHub Action will calculate a set of DevOps Research and Assessment (DORA)
metrics based on status and dates from commits and issues.

![Deploy Rate](badges/deploy-rate.svg)
![Lead Time](badges/lead-time.svg)
![Change Failure Rate](badges/change-failure-rate.svg)
![Mean Time to Restore](badges/mean-time-to-restore.svg)

## Inputs

### `repo`

Repository from where to read issues and statuses. List one or more
repositories, either as one single string, as an array or all separated by
newlines. Valid formats are:

```yaml
repo: my-repository
```

```yaml
repo: [my-repository, my-other-repository]
```

```yaml
repo: my-repository my-other-repository
```

Entries may also be given as `owner/repository`; the owner part must then
match the `owner` input (case-insensitive).

```yaml
repo: stenjo/devops-metrics-action
```

Default `repo` value is repository where action is installed
if no repositories are specified.

Every repository name is validated against GitHub's naming rules (letters,
digits, `_`, `.` and `-`, 1–100 characters, no `..`) before any API call is
made. An invalid entry fails the run with a message naming the offending
value. At most **25 repositories** can be analysed in one run; more than that
fails the run before any API call (see
[API usage and limits](#api-usage-and-limits)).

### `owner`

Owner of the repository. Default is current repository owner or organization.
Only one is handled. Validated with the same naming rules as `repo`.

### `token`

Access token for the repository. Defaults to `${{ github.token }}`, so the
common case needs no configuration. Resolution order is the `token` input,
then the `GH_TOKEN` environment variable. The action fails fast if neither
yields a token, rather than silently running unauthenticated. The resolved
token is registered with the runner as a secret so it is masked in logs.

The action only **reads** releases, commits, pull requests and issues; it
never writes to GitHub. For the repository running the workflow,
`${{ github.token }}` with this read-only `permissions:` block is sufficient
(see [Usage](#usage)):

```yaml
permissions:
  contents: read # releases, commits
  pull-requests: read # pull requests
  issues: read # issues (for mttr / change-failure-rate)
```

`GITHUB_TOKEN` is scoped to the current repository and cannot read other
**private** repositories. To read metrics from other repositories, pass a
[fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
that is granted read-only **Contents**, **Pull requests** and **Issues**
(and, for private repositories, **Metadata**) on exactly the target
repositories, and store it as a repository secret:

```yaml
token: ${{ secrets.METRICS_PAT }}
```

### `logging`

Set to true to make the `*-log` outputs available. Each log is a JSON array
of the releases or pull requests behind the metric, see
[Log outputs](#log-outputs).

### `filtered`

Set to true to filter pulls to only include feat and fix as basis for the lead
time metric

Both `logging` and `filtered` are enabled only by the literal string `true`.
Any other value (such as `yes` or `1`) is treated as `false` and reported as a
workflow warning.

### `bug-label`

Name of the issue label that identifies a bug or incident. Issues carrying this
label form the basis for the `change-failure-rate` and `mttr` metrics. Default
is `bug`. The value is trimmed and must be at most 50 characters (GitHub's
label limit); an empty value falls back to the default.

```yaml
bug-label: incident
```

## Outputs

All four metrics share one time window: the **30 days ending at the moment the
action runs** (`from = now - 30 days`, `to = now`). An event counts when
`from <= t < to`, so an event exactly 30 days old is included and one that is
30 days and 1 ms old is not. The event each metric filters on is:

| Metric                | Window applied to                        |
| --------------------- | ---------------------------------------- |
| `deploy-frequency`    | release `published_at`                   |
| `lead-time`           | pull request `merged_at`                 |
| `change-failure-rate` | release `published_at` (the denominator) |
| `mttr`                | bug issue `created_at`                   |

The action fetches a further 30 days of history before `from` so that `mttr`
and `change-failure-rate` can find the release that preceded a bug opened early
in the window.

The four metric outputs are **always numeric**. A repository with no release
(or no pull request) in the fetched period does not fail the run: the metrics
that cannot be computed are reported as `0`, one workflow warning is written
per such metric (`mttr defaulted to 0: no releases in the window`), and
[`metrics-status`](#metrics-status) records which metrics were defaulted so a
consumer can tell "0 bugs" from "no data".

### `deploy-frequency`

Rate of deploys (tagged releases) per week over the 30-day window. Decimal
number. Elite performing teams has 7 as target (daily- or on-demand release)

`deploy-rate-log` - a JSON array of the releases forming the basis for the
metric, if `logging` is enabled. See [Log outputs](#log-outputs).

### `lead-time`

Time from issue is set to status doing until linked pull-requestis merged to
main branch. Number in days (Integer)

`lead-time-log` - a JSON array of the pull requests with matching first commit
and release forming the basis for the metric, if `logging` is enabled. See
[Log outputs](#log-outputs).

### `change-failure-rate`

Number of registered issues tagged as bugs divided by number of release tags
in the window. By counting the bugs (GitHub issues tagged with the `bug-label`
label, default `bug`) between releases in the window and average this, we get
the failures over releases rate. Number in range 0 - 100 (%)

`change-failure-rate-log` - a JSON array of the releases counted as failed,
each with the bugs opened before the next release, if `logging` is enabled.
See [Log outputs](#log-outputs).

### `mttr`

Mean time to restore. This metric is calculated based on the time between the
last release before an issue tagged with the `bug-label` label (default `bug`)
and the first release after the issue is closed. For this to work correctly we
must assume GitHub issues are created for all unwanted issues in production and
that all changes to production is done through releases. Number in days (two
decimals)

`mttr-log` - a JSON array of the bugs the mean is based on, each with the
release before it was opened and the release after it was closed, if `logging`
is enabled. See [Log outputs](#log-outputs).

### `metrics-status`

A JSON object (always set) mapping each metric to `"computed"` or `"no-data"`:

```json
{
  "deploy-rate": "computed",
  "lead-time": "no-data",
  "change-failure-rate": "computed",
  "mttr": "computed"
}
```

`"no-data"` means the metric was defaulted to `0` because there was nothing
to compute from: no releases in the fetched period (all four metrics), or no
pull requests (`lead-time` only). A metric with data that legitimately comes
out at `0` — for example `change-failure-rate` with releases but no bugs — is
`"computed"`. Read it with `fromJSON`:

```yaml
- if: fromJSON(steps.dora.outputs.metrics-status).mttr == 'no-data'
  run: echo "::notice::No releases yet, mttr is not meaningful"
```

### Log outputs

With `logging: true` the action also emits `deploy-rate-log`, `lead-time-log`,
`change-failure-rate-log` and `mttr-log`. All are **JSON array strings** meant
to be parsed with `fromJSON` or `jq`, never echoed as free text. Every record
carries `repo` (`owner/repo`, lower-cased) so the records of a multi-repository
run stay attributable. Records look like:

```json
[
  {
    "kind": "release",
    "repo": "stenjo/devops-metrics-action",
    "at": "2026-10-01T12:00:00Z",
    "name": "v1.4.1"
  }
]
```

```json
[
  {
    "kind": "pull",
    "repo": "stenjo/devops-metrics-action",
    "at": "2026-09-30T09:12:00Z",
    "title": "feat: add thing",
    "commitAt": "2026-09-28T14:03:00Z",
    "commitMessage": "feat: start thing",
    "releaseAt": "2026-10-01T12:00:00Z",
    "release": "v1.4.1",
    "leadTimeDays": 2.91
  }
]
```

```json
[
  {
    "kind": "failed-release",
    "repo": "stenjo/devops-metrics-action",
    "at": "2026-10-01T12:00:00Z",
    "name": "v1.4.1",
    "bugs": [
      {
        "number": 42,
        "title": "bug: crash on start",
        "createdAt": "2026-10-02T08:15:00Z"
      }
    ]
  }
]
```

A `failed-release` record is one release interval counted as failed: the
release that was deployed and the `bug-label` issues opened before the next
release (or before now, for the latest release). The number of records equals
the failed-deploy count used in the rate.

```json
[
  {
    "kind": "restore",
    "repo": "stenjo/devops-metrics-action",
    "number": 42,
    "title": "bug: crash on start",
    "createdAt": "2026-10-02T08:15:00Z",
    "closedAt": "2026-10-03T10:00:00Z",
    "releaseBefore": "v1.4.1",
    "releaseBeforeAt": "2026-10-01T12:00:00Z",
    "releaseAfter": "v1.4.2",
    "releaseAfterAt": "2026-10-04T09:00:00Z",
    "restoreDays": 2.88
  }
]
```

A `restore` record is one bug that contributes to the mean time to restore:
the last release before it was opened, the first release after it was closed,
and the days between those two releases. Bugs that are still open or that have
no release on both sides are not counted and not logged, so the mean of
`restoreDays` matches `mttr` (up to rounding).

The logs are safe by construction:

- Every string field (`title`, `commitMessage`, `name`, `release`) is
  sanitized: control characters and newlines are removed, whitespace is
  collapsed, backticks and `${` / `$(` openers are stripped, and the text is
  truncated to 200 characters with a trailing `…`. `repo` is built from the
  validated `owner` / `repo` inputs, never from API text.
- Each log is capped at 500 records and just under 1 MiB (GitHub's output
  limit). When cut, the last record is `{"kind": "truncated", "omitted": n}`.

Use `fromJSON` to work with the records in expressions, or `jq` in a script:

```yaml
- name: DevOps Metrics from GitHub
  uses: stenjo/devops-metrics-action@v2
  id: dora
  with:
    logging: true

- name: Releases behind the deploy rate
  env:
    RELEASES: ${{ join(fromJSON(steps.dora.outputs.deploy-rate-log).*.name, ', ') }}
  run: echo "Releases last month: $RELEASES"

- name: Lead-time table
  env:
    LEAD_TIME_LOG: ${{ steps.dora.outputs.lead-time-log }}
  run: |
    {
      echo '| Repository | Merged | Pull request | Released | Days |'
      echo '| --- | --- | --- | --- | --- |'
      jq -r '.[] | select(.kind == "pull")
        | "| \(.repo) | \(.at) | \(.title) | \(.release) | \(.leadTimeDays) |"' <<< "$LEAD_TIME_LOG"
    } >> "$GITHUB_STEP_SUMMARY"

- name: Failed releases behind the change failure rate
  env:
    CFR_LOG: ${{ steps.dora.outputs.change-failure-rate-log }}
  run: |
    {
      echo '| Repository | Published | Release | Bugs opened before next release |'
      echo '| --- | --- | --- | --- |'
      jq -r '.[] | select(.kind == "failed-release")
        | "| \(.repo) | \(.at) | \(.name) | \([.bugs[] | "#\(.number) \(.title)"] | join("<br>")) |"' <<< "$CFR_LOG"
    } >> "$GITHUB_STEP_SUMMARY"

- name: Bugs behind the mean time to restore
  env:
    MTTR_LOG: ${{ steps.dora.outputs.mttr-log }}
  run: |
    {
      echo '| Repository | Bug | Opened | Closed | Release before | Release after | Days |'
      echo '| --- | --- | --- | --- | --- | --- | --- |'
      jq -r '.[] | select(.kind == "restore")
        | "| \(.repo) | #\(.number) \(.title) | \(.createdAt) | \(.closedAt) | \(.releaseBefore) | \(.releaseAfter) | \(.restoreDays) |"' <<< "$MTTR_LOG"
    } >> "$GITHUB_STEP_SUMMARY"
```

> [!NOTE]
> **Migrating from v1:** the logs used to be newline-separated free text
> (`pull->  <date> : <title>` lines). Any consumer that `grep`ped or split those
> lines must switch to `fromJSON` / `jq` on the record fields above.

## API usage and limits

A run costs roughly three paginated listings per repository (releases, pull
requests, issues) plus one request per merged pull request that has a later
release. To keep a run within the budget of the caller's token (1,000
requests per hour for `GITHUB_TOKEN`), the action bounds itself:

| Bound                                   | Value | When exceeded                                                                   |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| Repositories per run                    | 25    | The run fails before any API call, naming the limit.                            |
| Pages per listing per repository        | 99    | Paging stops and a warning is written; results for that listing are incomplete. |
| Pull requests whose commits are fetched | 200   | A warning is written; `lead-time` is computed from the first 200.               |
| Commit requests in flight at once       | 4     | —                                                                               |

Requests are issued through the Octokit `throttling` and `retry` plugins: a
primary rate limit is waited out and retried once, a secondary (abuse) limit
is logged and not retried, and transient `5xx` / network failures are retried
with backoff. The remaining rate limit (`x-ratelimit-remaining`) is written to
the log at the end of every successful run.

## Usage

Simplest possible use of this action is something like this:

```yaml
name: Calculate DevOps Metrics

on:
  schedule:
    - cron: '30 0 * * *'

# The action is read-only; grant nothing more.
permissions:
  contents: read # releases, commits
  pull-requests: read # pull requests
  issues: read # issues (for mttr / change-failure-rate)

jobs:
  update-metrics:
    runs-on: ubuntu-latest
    name: Checking the dora metrics
    steps:
      - name: DevOps Metrics from GitHub
        uses: stenjo/devops-metrics-action@v2
        id: dora
```

This will base calculations on the repository where the
workflow is installed and run 12:30 AM every day. The `token` input defaults
to `${{ github.token }}`, and the explicit `permissions:` block keeps that
token read-only instead of inheriting the repository default (often `write`).
If a later step needs more — for example `contents: write` to commit metric
history — grant it to that job only, as
[.github/workflows/dora.yaml](https://github.com/stenjo/devops-metrics-action/blob/main/.github/workflows/dora.yaml)
does. To
access the outputs anywhere in the workflow, refer to the
output of the calculation step via variable format
`${{ steps.dora.outputs.deploy-rate }}`. Something like:

```yaml
- name: Get the output rate
  run: echo "The deploy rate was ${{ steps.dora.outputs.deploy-rate }}"
  #  Use the output from the `dora` step
```

> [!WARNING]
> Even though the `*-log` outputs are sanitized JSON, do **not** interpolate
> them (e.g. `${{ steps.dora.outputs.lead-time-log }}`) directly into a `run:`
> script. The content still originates from pull-request titles and commit
> messages written by anyone who can contribute to the monitored repositories.
> Pass log outputs through the environment so their content is treated
> literally, and parse them with `fromJSON` or `jq`:
>
> ```yaml
> - name: Get the lead time
>   env:
>     LEAD_TIME: ${{ steps.dora.outputs.lead-time }}
>     LEAD_TIME_LOG: ${{ steps.dora.outputs.lead-time-log }}
>   run: |
>     echo "The lead time was $LEAD_TIME"
>     jq -r '.[] | select(.kind == "pull") | .title' <<< "$LEAD_TIME_LOG"
> ```

More complex examples may be found in
[.github/workflows/badges.yaml](https://github.com/stenjo/devops-metrics-action/blob/main/.github/workflows/badges.yaml)
and
[.github/workflows/dora.yaml](https://github.com/stenjo/devops-metrics-action/blob/main/.github/workflows/dora.yaml)

Badges at the top of this file is generated through the badges.yaml workflow.
More on this in [Create badges for metrics output](badges.md)
