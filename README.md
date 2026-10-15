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

Default `repo` value is repository where action is installed
if no repositories are specified.

### `owner`

Owner of the repository. Default is current repository owner or organization.
Only one is handled.

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

### `bug-label`

Name of the issue label that identifies a bug or incident. Issues carrying this
label form the basis for the `change-failure-rate` and `mttr` metrics. Default
is `bug`.

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

### `mttr`

Mean time to restore. This metric is calculated based on the time between the
last release before an issue tagged with the `bug-label` label (default `bug`)
and the first release after the issue is closed. For this to work correctly we
must assume GitHub issues are created for all unwanted issues in production and
that all changes to production is done through releases. Number in hours
(integer)

### Log outputs

With `logging: true` the action also emits `deploy-rate-log` and
`lead-time-log`. Both are **JSON array strings** meant to be parsed with
`fromJSON` or `jq`, never echoed as free text. Records look like:

```json
[{"kind": "release", "at": "2026-10-01T12:00:00Z", "name": "v1.4.1"}]
```

```json
[
  {
    "kind": "pull",
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

The logs are safe by construction:

- Every string field (`title`, `commitMessage`, `name`, `release`) is
  sanitized: control characters and newlines are removed, whitespace is
  collapsed, backticks and `${` / `$(` openers are stripped, and the text is
  truncated to 200 characters with a trailing `…`.
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
      echo '| Merged | Pull request | Released | Days |'
      echo '| --- | --- | --- | --- |'
      jq -r '.[] | select(.kind == "pull")
        | "| \(.at) | \(.title) | \(.release) | \(.leadTimeDays) |"' <<< "$LEAD_TIME_LOG"
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
