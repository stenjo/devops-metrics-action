# Changelog

## [2.1.3](https://github.com/stenjo/devops-metrics-action/compare/v2.1.2...v2.1.3) (2026-10-29)


### Bug Fixes

* **deps:** bump transitive undici to 6.29.1 to clear Trivy CVE findings ([#521](https://github.com/stenjo/devops-metrics-action/issues/521)) ([96b4dc3](https://github.com/stenjo/devops-metrics-action/commit/96b4dc3d5d222de66e632f0d9e9e2b0da8ebc4d7))

## [2.1.2](https://github.com/stenjo/devops-metrics-action/compare/v2.1.1...v2.1.2) (2026-10-22)


### Bug Fixes

* **ci:** autostash before rebasing badge commits onto main ([#501](https://github.com/stenjo/devops-metrics-action/issues/501)) ([0c9f127](https://github.com/stenjo/devops-metrics-action/commit/0c9f127dd557bc3160785dc53990547a56e1f7cd)), closes [#500](https://github.com/stenjo/devops-metrics-action/issues/500)
* **ci:** open release-please PRs with a GitHub App token ([#503](https://github.com/stenjo/devops-metrics-action/issues/503)) ([168d61a](https://github.com/stenjo/devops-metrics-action/commit/168d61ac9763d7249aba2bed31348eeacb7e62c5))
* lead time to use the earliest later release ([#510](https://github.com/stenjo/devops-metrics-action/issues/510)) ([375e7a7](https://github.com/stenjo/devops-metrics-action/commit/375e7a7b173bd125bf412c69b1f422570c964042))

## [2.1.1](https://github.com/stenjo/devops-metrics-action/compare/v2.1.0...v2.1.1) (2026-10-21)


### Bug Fixes

* **metrics:** return empty results instead of throwing on empty release lists ([#493](https://github.com/stenjo/devops-metrics-action/issues/493)) ([d13c665](https://github.com/stenjo/devops-metrics-action/commit/d13c665baf9a1fd1b2eef67e994c5bec545d461d)), closes [#461](https://github.com/stenjo/devops-metrics-action/issues/461)

## [2.1.0](https://github.com/stenjo/devops-metrics-action/compare/v2.0.0...v2.1.0) (2026-10-16)


### Features

* **client:** add Octokit throttling/retry and bound repositories, pages and commit fetches ([#487](https://github.com/stenjo/devops-metrics-action/issues/487)) ([73ad069](https://github.com/stenjo/devops-metrics-action/commit/73ad069557e30f79e92738b0146bd3edb25d5bce)), closes [#458](https://github.com/stenjo/devops-metrics-action/issues/458)
* **logging:** include the repository in every log record ([#485](https://github.com/stenjo/devops-metrics-action/issues/485)) ([ab20b95](https://github.com/stenjo/devops-metrics-action/commit/ab20b9564634d52fd004e8ec1ce2e3a78b667640)), closes [#239](https://github.com/stenjo/devops-metrics-action/issues/239)
* **metrics:** share one 30-day MetricsWindow across adapters and metrics ([#489](https://github.com/stenjo/devops-metrics-action/issues/489)) ([a180e5b](https://github.com/stenjo/devops-metrics-action/commit/a180e5b1e3143b840272a228383448f7d4284415)), closes [#460](https://github.com/stenjo/devops-metrics-action/issues/460)


### Performance Improvements

* **adapters:** stop paginating once results fall outside the metrics window ([#488](https://github.com/stenjo/devops-metrics-action/issues/488)) ([b1b4ce7](https://github.com/stenjo/devops-metrics-action/commit/b1b4ce7e72212a58c023a51a3314e0585530b581)), closes [#459](https://github.com/stenjo/devops-metrics-action/issues/459)

## [2.0.0](https://github.com/stenjo/devops-metrics-action/compare/v1.4.1...v2.0.0) (2026-10-16)


### ⚠ BREAKING CHANGES

* **security:** the `deploy-rate-log` and `lead-time-log` outputs are now JSON array strings instead of newline-separated `pull-> ... : <title>` / `release-> <name>:<date>` lines. Consumers that grep or split those lines must switch to `fromJSON` / `jq` on the record fields. The `Log is filtered - only feat and fix.` header line is gone.

### Features

* **cfr:** emit change-failure-rate-log with the failed releases and their bugs ([#480](https://github.com/stenjo/devops-metrics-action/issues/480)) ([9349420](https://github.com/stenjo/devops-metrics-action/commit/9349420761f24da26dedb1d2ca29f0d4be61fbe6))
* **mttr:** emit mttr-log with the bugs and bounding releases behind the mean ([#481](https://github.com/stenjo/devops-metrics-action/issues/481)) ([cdbc4fb](https://github.com/stenjo/devops-metrics-action/commit/cdbc4fb3ecba8f83af92e59a871cb8d09e072e48))
* **security:** emit *-log outputs as sanitized, bounded JSON ([#473](https://github.com/stenjo/devops-metrics-action/issues/473)) ([05da043](https://github.com/stenjo/devops-metrics-action/commit/05da0435c874121f2eac50a9f37213cfb7cae879)), closes [#455](https://github.com/stenjo/devops-metrics-action/issues/455)


### Bug Fixes

* **ci:** drop the removed package-name input from release-please v4 ([#483](https://github.com/stenjo/devops-metrics-action/issues/483)) ([3add1dc](https://github.com/stenjo/devops-metrics-action/commit/3add1dcbf0b737cd3eaad0472813634eba80d8f6))
* **inputs:** validate owner, repo and bug-label at the action boundary ([#479](https://github.com/stenjo/devops-metrics-action/issues/479)) ([cf3ee97](https://github.com/stenjo/devops-metrics-action/commit/cf3ee975fbd37f06620d66944a4d109772a53f66)), closes [#462](https://github.com/stenjo/devops-metrics-action/issues/462)
* **security:** fetch pull commits via route template, never commits_url ([#475](https://github.com/stenjo/devops-metrics-action/issues/475)) ([a047271](https://github.com/stenjo/devops-metrics-action/commit/a047271db58cb615757d7fe7eb269ea81f2cd59d))

## [1.4.1](https://github.com/stenjo/devops-metrics-action/compare/v1.4.0...v1.4.1) (2026-10-15)


### Bug Fixes

* **auth:** fail fast when no token is available and register it with core.setSecret ([#469](https://github.com/stenjo/devops-metrics-action/issues/469)) ([145988f](https://github.com/stenjo/devops-metrics-action/commit/145988f92eb4e60a89c08912a923df98296caf35)), closes [#456](https://github.com/stenjo/devops-metrics-action/issues/456)

## [1.4.0](https://github.com/stenjo/devops-metrics-action/compare/v1.3.5...v1.4.0) (2026-09-24)


### Features

* **mttr:** specify tag name that otherwise defaults to bug ([f020c5f](https://github.com/stenjo/devops-metrics-action/commit/f020c5f178de5be9b7bbd9f15fc9bd2188ed4b39)), closes [#434](https://github.com/stenjo/devops-metrics-action/issues/434)

## [1.3.5](https://github.com/stenjo/devops-metrics-action/compare/v1.3.4...v1.3.5) (2026-09-11)


### Bug Fixes

* patch undici CVEs and rebuild dist ([657d183](https://github.com/stenjo/devops-metrics-action/commit/657d18347c354599b696049d6b05eed6770f3cb4))
* patch undici CVEs to satisfy Trivy in Lint Codebase ([e155265](https://github.com/stenjo/devops-metrics-action/commit/e155265527d3b53ad34fc1c2a4bac206679e941b))
* patch undici CVEs to satisfy Trivy in Lint Codebase ([5b8091b](https://github.com/stenjo/devops-metrics-action/commit/5b8091b31999e55d4a53549b08aad9c49b6642d5))

## [1.3.4](https://github.com/stenjo/devops-metrics-action/compare/v1.3.3...v1.3.4) (2026-07-23)


### Bug Fixes

* format empty mock objects for prettier compatibility ([cfb24a8](https://github.com/stenjo/devops-metrics-action/commit/cfb24a82ad8a1b0966256870b001e60bc6c0897e))

## [1.3.3](https://github.com/stenjo/devops-metrics-action/compare/v1.3.2...v1.3.3) (2026-06-25)


### Bug Fixes

* pull --rebase before pushing badge updates to avoid rejection ([86fef13](https://github.com/stenjo/devops-metrics-action/commit/86fef134029e90cccd4cb291c0cc54ad4f067a64))
* quote shell interpolations in deploy-rate-log to prevent redirection ([8a87c37](https://github.com/stenjo/devops-metrics-action/commit/8a87c37269793744218f7e16e67677047ff34dc2))

## [1.3.2](https://github.com/stenjo/devops-metrics-action/compare/v1.3.1...v1.3.2) (2026-04-13)


### Bug Fixes

* allow duplicate headings (MD024) in changelog ([cc63613](https://github.com/stenjo/devops-metrics-action/commit/cc636134cbd0e37ef8a5ad45483b4b915ea0b523))
* resolve textlint and markdownlint errors in CHANGELOG ([07951db](https://github.com/stenjo/devops-metrics-action/commit/07951db9517ba3d15b0794c2603f341f79818342))
* update upload-artifact SHA to match v7 tag ([bfd6b29](https://github.com/stenjo/devops-metrics-action/commit/bfd6b2952f7b3042df4e6ca97e5a79b112580bf7))

## [1.3.1](https://github.com/stenjo/devops-metrics-action/compare/v1.3.0...v1.3.1) (2026-04-07)

### Bugfixes

- add explicit Git auth for push steps after persist-credentials: false ([a3a1cba](https://github.com/stenjo/devops-metrics-action/commit/a3a1cba429720cdfc61425ca54d3ebc681fb208b))
- ignore zizmor impostor-commit audit (403 on cross-repo API calls) ([3af014e](https://github.com/stenjo/devops-metrics-action/commit/3af014e0aebae3164d1f98b1c38bedd5db23c5be))
- remove unsupported semver-major-days for GitHub Actions in dependabot ([c4f9bc1](https://github.com/stenjo/devops-metrics-action/commit/c4f9bc10ba73f44b45f3b6604c4f43ef69076d92))
- replace impostor commit SHA for mshick/add-pr-comment with verified v2.8.2 ([929a659](https://github.com/stenjo/devops-metrics-action/commit/929a659061da48ace68e0937ec116a8ff3a0b79d))
- resolve all Super-Linter v8 errors ([e796e01](https://github.com/stenjo/devops-metrics-action/commit/e796e01caeea1da3f8771aa4028573be95b53ee3))
- resolve ESLint 10 peer dependency conflicts
  ([c3f3499](https://github.com/stenjo/devops-metrics-action/commit/c3f3499d65f1c9353d121895b80bf6369c0ea55e))
- super-linter errors ([70a8225](https://github.com/stenjo/devops-metrics-action/commit/70a8225bbac78fbc468a59a777276a2872104384))
- update codeql-action version comments to match pinned SHA ([cba8665](https://github.com/stenjo/devops-metrics-action/commit/cba8665b499d78388e18430bebae16a8f6a6b07c))
- update undici to 6.24.1 to resolve CVEs ([aba1b84](https://github.com/stenjo/devops-metrics-action/commit/aba1b84f1cf73d003316e846ab08ecdff43f3620))
- use commit SHAs instead of annotated tag SHAs for pinned actions ([dffb151](https://github.com/stenjo/devops-metrics-action/commit/dffb15137128edf9765043fec066972953cf1a16))

## [1.3.0](https://github.com/stenjo/devops-metrics-action/compare/v1.2.1...v1.3.0) (2026-02-24)

### Features

- **node:** update to 22 ([ff72610](https://github.com/stenjo/devops-metrics-action/commit/ff72610e097ff016573ddd9902c67938282f4eb8))

### Bugfixes

- update config for @octokit/core v7 ESM compatibility ([98db360](https://github.com/stenjo/devops-metrics-action/commit/98db36069fafa1da3a9faa7e3e8e8c2512aa9028))
