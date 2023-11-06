# Changelog

## [1.1.0](https://github.com/stenjo/devops-metrics-action/compare/v1.0.3...v1.1.0) (2023-11-06)


### Features

* **deploy rate:** add option to get list of issues/commits/releases that deploy frequency is based on ([#240](https://github.com/stenjo/devops-metrics-action/issues/240)) ([283a424](https://github.com/stenjo/devops-metrics-action/commit/283a42433fcdaa9f44d14c92625963787296738d))
* **lead time:** add option to get list of issues/commits/releases th… ([#242](https://github.com/stenjo/devops-metrics-action/issues/242)) ([2f848c5](https://github.com/stenjo/devops-metrics-action/commit/2f848c511e3331e3d8a8a34e050964303616e117))

## [1.0.3](https://github.com/stenjo/devops-metrics-action/compare/v1.0.2...v1.0.3) (2023-06-07)


### Miscellaneous Chores

* release 1.0.3 ([9833933](https://github.com/stenjo/devops-metrics-action/commit/9833933d21417e5d893c25958fa7c8c0d16220f5))

## [1.0.2](https://github.com/stenjo/devops-metrics-action/compare/v1.0.1...v1.0.2) (2023-05-23)


### Bug Fixes

* **docs:** action version reference ([c23d28a](https://github.com/stenjo/devops-metrics-action/commit/c23d28a11522a5e9dd72b364d19022bb38046824))
* linting and dynamic-badges-action ref ([000c610](https://github.com/stenjo/devops-metrics-action/commit/000c610b7a3f55a7500e366b2d210aa82dc335da))

## [1.0.1](https://github.com/stenjo/devops-metrics-action/compare/v1.0.0...v1.0.1) (2023-05-21)


### Bug Fixes

* (docs): update version ref in example ([3868fb0](https://github.com/stenjo/devops-metrics-action/commit/3868fb0517ff77af21dbd9c4025c80ae41416274))
* **release:** tag major and minor versions on release ([1b292d4](https://github.com/stenjo/devops-metrics-action/commit/1b292d4dfbd4a129873548a74cb0143f2adfa5d6))
* Set badges.yaml to ref version 1 ([26fb5aa](https://github.com/stenjo/devops-metrics-action/commit/26fb5aa75342ae40ed1ae3389bee43bffaf2bc41))
* update all version to 1.0.0 ([c7d0ba0](https://github.com/stenjo/devops-metrics-action/commit/c7d0ba0d0084cb2badfd39a4a976382db8dbc88f))

## [1.0.0](https://github.com/stenjo/devops-metrics-action/compare/v0.6.0-beta...v1.0.0) (2023-05-20)


### Bug Fixes

* **workflow:** update versiion reference of actions ([25ba9ec](https://github.com/stenjo/devops-metrics-action/commit/25ba9eca29382cc04fe502de26ffdf6d1e0d1b40))


### Miscellaneous Chores

* release 1.0.0 ([1ffc307](https://github.com/stenjo/devops-metrics-action/commit/1ffc3073f9ea241bb2cba6572ff3cffe9b014906))

## [0.6.0-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.5.1-beta...v0.6.0-beta) (2023-05-18)


### Features

* handle several repos ([#69](https://github.com/stenjo/devops-metrics-action/issues/69)) ([0a9c85b](https://github.com/stenjo/devops-metrics-action/commit/0a9c85b62e6a94ce86b85933f8486a6917c7269b))

## [0.5.1-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.5.0-beta...v0.5.1-beta) (2023-05-11)


### Bug Fixes

* change min color range on lead-time ([c139bc6](https://github.com/stenjo/devops-metrics-action/commit/c139bc692b37ba3954f1e8fde282e5faa52b0e38))
* **issues:** not all issues are fetched going back 1 month ([#66](https://github.com/stenjo/devops-metrics-action/issues/66)) ([5b36db8](https://github.com/stenjo/devops-metrics-action/commit/5b36db871a2251c9aff41054dda03ef0d8b7f0d2))

## [0.5.0-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.4.2-beta...v0.5.0-beta) (2023-05-05)


### Features

* calculate lead time of issues ([a48f642](https://github.com/stenjo/devops-metrics-action/commit/a48f6423b8079f62801b1bcb39416eaefb3b5a39))


### Bug Fixes

* lead-time is null when unreleased pulls ([a53ed24](https://github.com/stenjo/devops-metrics-action/commit/a53ed243ba337f70f5f93039b8a9610c99861356))
* MTTR Exception on no release after bug ([96c42a0](https://github.com/stenjo/devops-metrics-action/commit/96c42a0fbb54ba9fc6a9b73caea9a1cab75c6064))

## [0.4.2-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.4.1-beta...v0.4.2-beta) (2023-05-03)


### Bug Fixes

* change failure rate store in gist ([19f98bb](https://github.com/stenjo/devops-metrics-action/commit/19f98bbde299c118e0485d07f123acf71a9f9e36))
* change failure rate was calculated wrong ([#49](https://github.com/stenjo/devops-metrics-action/issues/49)) ([9eb8f9b](https://github.com/stenjo/devops-metrics-action/commit/9eb8f9b4baeb17a49224ae5b21dab6d08078584c))
* colorscale on deploy rate ([14fd18b](https://github.com/stenjo/devops-metrics-action/commit/14fd18b70946c60dd1ae070059be54cd93fb07f0))
* swapped max and min color range on CFR ([a82f534](https://github.com/stenjo/devops-metrics-action/commit/a82f5340cbf29070290caa0fa1c23be44f18c23f))

## [0.4.1-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.4.0-beta...v0.4.1-beta) (2023-05-01)


### Bug Fixes

* handle empty release list ([#42](https://github.com/stenjo/devops-metrics-action/issues/42)) ([ce04048](https://github.com/stenjo/devops-metrics-action/commit/ce040485974f9b17b4e70cc676d2f41211a906f5))
* report 0 mttr when no bugs ([fad1064](https://github.com/stenjo/devops-metrics-action/commit/fad1064456834164ea75f1dda44259a184339cd6))

## [0.4.0-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.3.1-beta...v0.4.0-beta) (2023-05-01)


### Features

* mean time to restore mttr ([#34](https://github.com/stenjo/devops-metrics-action/issues/34)) ([a145705](https://github.com/stenjo/devops-metrics-action/commit/a145705c0d8a6c2331ffbda7652080e22a13d8ce))

## [0.3.1-beta](https://github.com/stenjo/devops-metrics-action/compare/v0.3.0-beta...v0.3.1-beta) (2023-04-30)


### Bug Fixes

* added token input to param ([#32](https://github.com/stenjo/devops-metrics-action/issues/32)) ([ff2b1cb](https://github.com/stenjo/devops-metrics-action/commit/ff2b1cbb473b7616e2055561882e66f94102ec65))

## [0.2.1](https://github.com/stenjo/devops-metrics-action/compare/v0.2.0...v0.2.1) (2023-04-30)


### Bug Fixes

* action name ([fe47197](https://github.com/stenjo/devops-metrics-action/commit/fe47197c927d0beac003c0bdc7eeb6991f43a5aa))
* version ans name ([defd735](https://github.com/stenjo/devops-metrics-action/commit/defd7354072c3e7d750326cc23713a1238fadbad))

## [0.2.0](https://github.com/stenjo/devops-metrics-action/compare/v0.1.0...v0.2.0) (2023-04-30)


### Features

* first publish as action ([ec0ccbb](https://github.com/stenjo/devops-metrics-action/commit/ec0ccbbfef5d62657d9ff3e5db9070bb1089c957))


### Bug Fixes

* action.yaml with correct outputs ([f61f630](https://github.com/stenjo/devops-metrics-action/commit/f61f6309f831d5f5d07d494f23e90445f2402fd7))
* **issues:** include all issues two months back ([#28](https://github.com/stenjo/devops-metrics-action/issues/28)) ([b77df3f](https://github.com/stenjo/devops-metrics-action/commit/b77df3f1c470216904c792eac2d0bbbdbd959e21))
* README.md ([389371d](https://github.com/stenjo/devops-metrics-action/commit/389371db595eb5145c9a70577546f97913d360dd))
* **workflow:** update json when updated before ([8f99709](https://github.com/stenjo/devops-metrics-action/commit/8f997097aeb75e73d9063452f97c2f5f3cd21d5d))

## [0.1.0](https://github.com/stenjo/dora/compare/v0.0.2...v0.1.0) (2023-04-29)


### Features

* **deploy:** fixed gist write ([ab5b737](https://github.com/stenjo/dora/commit/ab5b73791ef2d3247038a4c0b7f4afc573a9fc80))


### Bug Fixes

* clean up ([5265568](https://github.com/stenjo/dora/commit/5265568661241b8be64cf7df2ea455ba736908ee))

## [0.0.2](https://github.com/stenjo/dora/compare/v0.0.1...v0.0.2) (2023-04-22)


### Bug Fixes

* **workflow:** update release and dora workflows ([0dfc0d6](https://github.com/stenjo/dora/commit/0dfc0d61c946b28808aa9d5a9dae1e34b312b2dc))

## 0.0.1 (2023-04-12)


### Features

* add tags ([00bb263](https://github.com/stenjo/dora/commit/00bb2635dd6f1ba48d4ddd60495a4ff7571c1452))


### Bug Fixes

* tags test ([b9d7318](https://github.com/stenjo/dora/commit/b9d7318893d5dc66c9ea5549507788d88f3bc406))


### Miscellaneous Chores

* release 0.0.1 ([9d38f27](https://github.com/stenjo/dora/commit/9d38f275d29ae453b733a3b365c46217ad8088ef))
