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
exports.CommitsAdapter = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const core_1 = require("@octokit/core");
const core = __importStar(require("@actions/core"));
class CommitsAdapter {
    token;
    octokit;
    constructor(token) {
        this.token = token;
        this.octokit = new core_1.Octokit({
            auth: this.token
        });
    }
    async getCommitsFromUrl(url) {
        try {
            const result = await this.getCommits(this.octokit, url);
            return result;
        }
        catch (e) {
            core.setFailed(e.message);
        }
    }
    async getCommits(octokit, url) {
        const result = await octokit.request(url, {
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        return Promise.resolve(result.data);
    }
}
exports.CommitsAdapter = CommitsAdapter;
//# sourceMappingURL=CommitsAdapter.js.map