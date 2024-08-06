"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssuesAdapter = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const core_1 = require("@octokit/core");
const core = __importStar(require("@actions/core"));
class IssuesAdapter {
    token;
    owner;
    repositories;
    today;
    constructor(token, owner, repositories) {
        this.token = token;
        this.owner = owner;
        this.repositories = repositories;
        this.today = new Date();
    }
    async GetAllIssuesLastMonth() {
        const since = new Date(this.today.valueOf() - 61 * 24 * 60 * 60 * 1000); // Go two months back
        try {
            const octokit = new core_1.Octokit({
                auth: this.token
            });
            let result = [];
            for (const repo of this.repositories) {
                let nextPage = await this.getIssues(octokit, repo, since, 1);
                result = result.concat(nextPage);
                for (let page = 2; page < 100 && nextPage.length === 100; page++) {
                    nextPage = await this.getIssues(octokit, repo, since, page);
                    result = result.concat(nextPage);
                }
            }
            return result;
        }
        catch (e) {
            core.setFailed(e.message);
        }
    }
    async getIssues(octokit, repo, since, page) {
        const result = await octokit.request('GET /repos/{owner}/{repo}/issues?state=all&since={since}&per_page={per_page}&page={page}', {
            owner: this.owner,
            repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            },
            since: since.toISOString(),
            per_page: 100,
            page
        });
        return Promise.resolve(result.data);
    }
}
exports.IssuesAdapter = IssuesAdapter;
//# sourceMappingURL=IssuesAdapter.js.map