import type { GithubClient } from "./client.js";
import { ISSUES_QUERY } from "./queries.js";
import type { RawIssue } from "./types.js";

interface FetchOptions {
  owner: string;
  name: string;
  states?: string[];
  labels?: string[];
  since?: string;
  limit: number;
  onProgress?: (count: number) => void;
}

interface IssuesResponse {
  repository: {
    issues: {
      nodes: RawIssue[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

export { createGitHubClient } from "./client.js";

export async function fetchIssues(
  octokit: GithubClient,
  options: FetchOptions,
): Promise<RawIssue[]> {
  const { owner, name, states, labels, since, limit, onProgress } = options;
  const allIssues: RawIssue[] = [];

  const iterator = octokit.graphql.paginate.iterator<IssuesResponse>(ISSUES_QUERY, {
    owner,
    name,
    states,
    labels,
    since: since ? new Date(since).toISOString() : undefined,
  });

  for await (const response of iterator) {
    const issues = response.repository.issues.nodes;
    allIssues.push(...issues);
    onProgress?.(allIssues.length);

    if (allIssues.length >= limit) {
      allIssues.length = limit;
      break;
    }
  }

  return allIssues;
}
