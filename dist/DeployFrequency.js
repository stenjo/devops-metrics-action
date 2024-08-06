"use strict";
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployFrequency = void 0;
// The number of milliseconds in one day
const ONE_DAY = 1000 * 60 * 60 * 24;
class DeployFrequency {
    log = [];
    today = new Date();
    rList = new Array();
    getLog() {
        return this.log;
    }
    constructor(releases, dateString = null) {
        this.rList = releases;
        if (this.rList === null || this.rList.length === 0) {
            throw new Error('Empty release list');
        }
        if (dateString !== null) {
            this.today = new Date(dateString);
        }
    }
    weekly() {
        let releaseCount = 0;
        for (const release of this.rList) {
            const relDate = new Date(release.published_at);
            if (this.days_between(this.today, relDate) < 8) {
                this.log.push(`release->  ${release.name}:${release.published_at}`);
                releaseCount++;
            }
        }
        return releaseCount;
    }
    monthly() {
        let releaseCount = 0;
        for (const release of this.rList) {
            const relDate = new Date(release.published_at);
            if (this.days_between(this.today, relDate) < 31) {
                this.log.push(`release->  ${release.name}:${release.published_at}`);
                releaseCount++;
            }
        }
        return releaseCount;
    }
    rate() {
        return (Math.round(this.monthly() * 700) / 3000).toFixed(2);
    }
    days_between(date1, date2) {
        // Calculate the difference in milliseconds
        const differenceMs = Math.abs(date1.valueOf() - date2.valueOf());
        // Convert back to days and return
        return Math.round(differenceMs / ONE_DAY);
    }
}
exports.DeployFrequency = DeployFrequency;
//# sourceMappingURL=DeployFrequency.js.map