"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeanTimeToRestore = void 0;
const ONE_DAY = 1000 * 60 * 60 * 24;
class MeanTimeToRestore {
    today;
    issues;
    releases;
    releaseDates; // array of object with unix time and repo url
    constructor(issues, releases, today = null) {
        if (today === null) {
            this.today = new Date();
        }
        else {
            this.today = today;
        }
        this.issues = issues;
        this.releases = releases;
        if (this.releases === null || this.releases.length === 0) {
            throw new Error('Empty release list');
        }
        this.releaseDates = this.releases
            .map(function (r) {
            return { published: +new Date(r.published_at), url: r.url };
        })
            .sort((a, b) => a.published - b.published); // Sort ascending
    }
    getBugCount() {
        const bugs = this.getIssuesTaggedAsBug();
        const values = this.getStartAndEndTimesForBugs(bugs);
        return values;
    }
    getStartAndEndTimesForBugs(bugs) {
        const values = [];
        for (const bug of bugs) {
            const createdAt = +new Date(bug.created_at);
            const closedAt = +new Date(bug.closed_at);
            const repoName = bug.repository_url.split('/').reverse()[0];
            if (bug.closed_at != null &&
                this.hasLaterRelease(closedAt, repoName) &&
                this.hasPreviousRelease(createdAt, repoName)) {
                values.push({
                    start: createdAt,
                    end: closedAt,
                    repo: repoName
                });
            }
        }
        return values;
    }
    getIssuesTaggedAsBug() {
        const bugs = [];
        for (const issue of this.issues) {
            const createdAt = +new Date(issue.created_at);
            if (issue.labels.filter(label => label.name === 'bug').length > 0 &&
                createdAt > this.today.getTime() - 30 * ONE_DAY) {
                bugs.push(issue);
            }
        }
        return bugs;
    }
    hasPreviousRelease(date, repo) {
        return (this.releaseDates.filter(r => r.published < date && r.url.includes(repo))
            .length > 0);
    }
    getReleaseBefore(date, repo) {
        const rdates = this.releaseDates.filter(r => r.published < date && r.url.includes(repo));
        if (rdates.length === 0) {
            throw new Error('No previous releases');
        }
        return rdates.pop();
    }
    getReleaseAfter(date, repo) {
        const rdates = this.releaseDates.filter(r => r.published > date && r.url.includes(repo));
        if (rdates.length === 0) {
            throw new Error('No later releases');
        }
        return rdates.reverse().pop();
    }
    hasLaterRelease(date, repo) {
        return (this.releaseDates.filter(r => r.published > date && r.url.includes(repo))
            .length > 0);
    }
    getRestoreTime(bug) {
        const prevRel = this.getReleaseBefore(bug.start, bug.repo);
        const nextRel = this.getReleaseAfter(bug.end, bug.repo);
        return nextRel.published - prevRel.published;
    }
    mttr() {
        const ttr = this.getBugCount().map(bug => {
            return this.getRestoreTime(bug);
        }, this);
        if (ttr.length === 0) {
            return 0;
        }
        let sum = 0;
        for (const ttrElement of ttr) {
            sum += ttrElement;
        }
        return Math.round((sum / ttr.length / ONE_DAY) * 100) / 100; // Two decimals
    }
}
exports.MeanTimeToRestore = MeanTimeToRestore;
//# sourceMappingURL=MeanTimeToRestore.js.map