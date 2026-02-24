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

Access token for the repository.

### `logging`

Set to true to make event logs of metrics source avaiable.

### `filtered`

Set to true to filter pulls to only include feat and fix as basis for the lead
time metric

## Outputs

### `deploy-frequency`

Rate of deploys (tagged releases) per week. Decimal number. Elite performing
teams has 7 as target (daily- or on-demand release)

`deploy-frequency-log` - a list of releases forming the basis for the metric, if
`logging` is enabled.

### `lead-time`

Time from issue is set to status doing until linked pull-requestis merged to
main branch. Number in days (Integer)

`lead-time-log` - a list of pull requests with matching first commit and re
forming the basis for the metric, if `logging` is enabled.

### `change-failure-rate`

Number of registered issues tagged as bugs divided by number of release tags
last month. By counting the bugs (GitHub issues tagged as `bug`) between
releases the last month and average this, we get the failures over releases
rate. Number in range 0 - 100 (%)

### `mttr`

Mean time to restore. This metric is calculated based on the time between the
last release before an issue tagged as a bug and the first release after the bug
is closed. For this to work correctly we must assume GitHub issues are created
for all unwanted issues in production and that all changes to production is done
through releases. Number in hours (integer)

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

More complex examples may be found in
[.github/workflows/badges.yaml](https://github.com/stenjo/devops-metrics-action/blob/main/.github/workflows/badges.yaml)
and
[.github/workflows/dora.yaml](https://github.com/stenjo/devops-metrics-action/blob/main/.github/workflows/dora.yaml)

Badges at the top of this file is generated through the badges.yaml workflow.
More on this in [Create badges for metrics output](badges.md)
