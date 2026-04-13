import { Octokit } from "@octokit/core";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";

const OctokitWithPlugins = Octokit.plugin(paginateGraphQL);

export type GithubClient = InstanceType<typeof OctokitWithPlugins>;

export function createGitHubClient(token: string): GithubClient {
  return new OctokitWithPlugins({ auth: token });
}
