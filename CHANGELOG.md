# Changelog

## [1.3.1](https://github.com/stenjo/devops-metrics-action/compare/v1.3.0...v1.3.1) (2026-04-07)

### Bug Fixes

- add explicit git auth for push steps after persist-credentials: false ([a3a1cba](https://github.com/stenjo/devops-metrics-action/commit/a3a1cba429720cdfc61425ca54d3ebc681fb208b))
- ignore zizmor impostor-commit audit (403 on cross-repo API calls) ([3af014e](https://github.com/stenjo/devops-metrics-action/commit/3af014e0aebae3164d1f98b1c38bedd5db23c5be))
- remove unsupported semver-major-days for github-actions in dependabot ([c4f9bc1](https://github.com/stenjo/devops-metrics-action/commit/c4f9bc10ba73f44b45f3b6604c4f43ef69076d92))
- replace impostor commit SHA for mshick/add-pr-comment with verified v2.8.2 ([929a659](https://github.com/stenjo/devops-metrics-action/commit/929a659061da48ace68e0937ec116a8ff3a0b79d))
- resolve all Super-Linter v8 errors ([e796e01](https://github.com/stenjo/devops-metrics-action/commit/e796e01caeea1da3f8771aa4028573be95b53ee3))
- resolve eslint 10 peer dependency conflicts\n\nRemove eslint-plugin-github (only supports eslint ^8 || ^9) and\neslint-import-resolver-typescript. Add globals as direct dependency.\nUpdate eslint.config.mjs to use eslint-plugin-prettier directly\ninstead of the github preset." ([c3f3499](https://github.com/stenjo/devops-metrics-action/commit/c3f3499d65f1c9353d121895b80bf6369c0ea55e))
- super-linter errors ([70a8225](https://github.com/stenjo/devops-metrics-action/commit/70a8225bbac78fbc468a59a777276a2872104384))
- update codeql-action version comments to match pinned SHA ([cba8665](https://github.com/stenjo/devops-metrics-action/commit/cba8665b499d78388e18430bebae16a8f6a6b07c))
- update undici to 6.24.1 to resolve CVEs ([aba1b84](https://github.com/stenjo/devops-metrics-action/commit/aba1b84f1cf73d003316e846ab08ecdff43f3620))
- use commit SHAs instead of annotated tag SHAs for pinned actions ([dffb151](https://github.com/stenjo/devops-metrics-action/commit/dffb15137128edf9765043fec066972953cf1a16))

## [1.3.1](https://github.com/stenjo/devops-metrics-action/compare/v1.3.0...v1.3.1) (2026-04-07)

### Bug Fixes

- add explicit git auth for push steps after persist-credentials: false ([a3a1cba](https://github.com/stenjo/devops-metrics-action/commit/a3a1cba429720cdfc61425ca54d3ebc681fb208b))
- ignore zizmor impostor-commit audit (403 on cross-repo API calls) ([3af014e](https://github.com/stenjo/devops-metrics-action/commit/3af014e0aebae3164d1f98b1c38bedd5db23c5be))
- remove unsupported semver-major-days for github-actions in dependabot ([c4f9bc1](https://github.com/stenjo/devops-metrics-action/commit/c4f9bc10ba73f44b45f3b6604c4f43ef69076d92))
- replace impostor commit SHA for mshick/add-pr-comment with verified v2.8.2 ([929a659](https://github.com/stenjo/devops-metrics-action/commit/929a659061da48ace68e0937ec116a8ff3a0b79d))
- resolve all Super-Linter v8 errors ([e796e01](https://github.com/stenjo/devops-metrics-action/commit/e796e01caeea1da3f8771aa4028573be95b53ee3))
- resolve eslint 10 peer dependency conflicts\n\nRemove eslint-plugin-github (only supports eslint ^8 || ^9) and\neslint-import-resolver-typescript. Add globals as direct dependency.\nUpdate eslint.config.mjs to use eslint-plugin-prettier directly\ninstead of the github preset." ([c3f3499](https://github.com/stenjo/devops-metrics-action/commit/c3f3499d65f1c9353d121895b80bf6369c0ea55e))
- super-linter errors ([70a8225](https://github.com/stenjo/devops-metrics-action/commit/70a8225bbac78fbc468a59a777276a2872104384))
- update codeql-action version comments to match pinned SHA ([cba8665](https://github.com/stenjo/devops-metrics-action/commit/cba8665b499d78388e18430bebae16a8f6a6b07c))
- update undici to 6.24.1 to resolve CVEs ([aba1b84](https://github.com/stenjo/devops-metrics-action/commit/aba1b84f1cf73d003316e846ab08ecdff43f3620))
- use commit SHAs instead of annotated tag SHAs for pinned actions ([dffb151](https://github.com/stenjo/devops-metrics-action/commit/dffb15137128edf9765043fec066972953cf1a16))

## [1.3.0](https://github.com/stenjo/devops-metrics-action/compare/v1.2.1...v1.3.0) (2026-02-24)

### Features

- **node:** update to 22 ([ff72610](https://github.com/stenjo/devops-metrics-action/commit/ff72610e097ff016573ddd9902c67938282f4eb8))

### Bugfixes

- update config for @octokit/core v7 ESM compatibility ([98db360](https://github.com/stenjo/devops-metrics-action/commit/98db36069fafa1da3a9faa7e3e8e8c2512aa9028))
