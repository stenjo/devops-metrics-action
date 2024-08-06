"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadTime = void 0;
const ONE_DAY = 24 * 60 * 60 * 1000;
class LeadTime {
    log = [];
    pulls;
    releases;
    today;
    commitsAdapter;
    constructor(pulls, releases, commitsAdapter, today = null) {
        if (today === null) {
            this.today = new Date();
        }
        else {
            this.today = today;
        }
        this.pulls = pulls.filter(p => +new Date(p.merged_at) > this.today.valueOf() - 31 * ONE_DAY);
        this.releases = releases.map(r => {
            return {
                published: +new Date(r.published_at),
                url: r.url,
                name: r.name,
                published_at: r.published_at
            };
        });
        this.commitsAdapter = commitsAdapter;
    }
    getLog() {
        return this.log;
    }
    async getLeadTime(filtered = false) {
        if (this.pulls.length === 0 || this.releases.length === 0) {
            return 0;
        }
        if (filtered) {
            this.log.push(`\nLog is filtered - only feat and fix.`);
        }
        const leadTimes = [];
        for (const pull of this.pulls) {
            if (typeof pull.merged_at === 'string' &&
                pull.merged_at &&
                typeof pull.base.repo.name === 'string' &&
                pull.base.repo.name &&
                pull.base.ref === 'main') {
                if (filtered &&
                    !(pull.title.startsWith('feat') || pull.title.startsWith('fix'))) {
                    continue;
                }
                const mergeTime = +new Date(pull.merged_at);
                const laterReleases = this.releases.filter(r => r.published > mergeTime && r.url.includes(pull.base.repo.name));
                if (laterReleases.length === 0) {
                    continue;
                }
                const deployTime = laterReleases[0].published;
                this.log.push(`pull->      ${pull.merged_at} : ${pull.title}`);
                const commits = (await this.commitsAdapter.getCommitsFromUrl(pull.commits_url));
                const commitTime = commits
                    .map(c => +new Date(c.commit.committer.date))
                    .sort((a, b) => a - b)[0];
                const firstCommit = commits.sort((a, b) => {
                    return (+new Date(a.commit.committer.date) -
                        +new Date(b.commit.committer.date));
                })[0];
                this.log.push(`  commit->  ${firstCommit.commit.committer.date} : ${firstCommit.commit.message}`);
                this.log.push(`  release-> ${laterReleases[0].published_at} : ${laterReleases[0].name}`);
                const leadTime = (deployTime - commitTime) / ONE_DAY;
                leadTimes.push(leadTime);
                this.log.push(`  ${leadTime.toFixed(2)} days`);
            }
        }
        if (leadTimes.length === 0) {
            return 0;
        }
        return (Math.round((leadTimes.reduce((p, c) => p + c) / leadTimes.length) * 100) /
            100);
    }
}
exports.LeadTime = LeadTime;
//# sourceMappingURL=LeadTime.js.map