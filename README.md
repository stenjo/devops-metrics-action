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
value.

### `owner`

Owner of the repository. Default is current repository owner or organization.
Only one is handled. Validated with the same naming rules as `repo`.

### `token`

Access token for the repository. Defaults to `${{ github.token }}`, so the
common case needs no configuration. Resolution order is the `token` input,
then the `GH_TOKEN` environment variable. The action fails fast if neither
yields a token, rather than silently running unauthenticated. The resolved
token is registered with the runner as a secret so it is masked in logs.

To read metrics from other repositories than the one running the workflow,
pass a token with read access to those repositories:

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

### `deploy-frequency`

Rate of deploys (tagged releases) per week. Decimal number. Elite performing
teams has 7 as target (daily- or on-demand release)

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
last month. By counting the bugs (GitHub issues tagged with the `bug-label`
label, default `bug`) between releases the last month and average this, we get
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

## Usage

Simplest possible use of this action is something like this:

```yaml
name: Calculate DevOps Metrics

on:
  schedule:
    - cron: '30 0 * * *'

jobs:
  update-metrics:
    runs-on: ubuntu-latest
    name: Checking the dora metrics
    steps:
      - name: DevOps Metrics from GitHub
        uses: stenjo/devops-metrics-action@v1
        id: dora
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

This will base calculations on the repository where the
workflow is installed and run 12:30 AM every day. To
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
