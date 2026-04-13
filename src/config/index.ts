import ora from "ora";
import chalk from "chalk";
import { createGitHubClient, fetchIssues } from "../github/fetcher.js";
import { cleanIssue } from "../processing/cleaner.js";
import { transformIssue, type ProcessedIssue } from "../processing/transformer.js";
import { chunkIssues } from "../processing/chunker.js";
import { analyzeBatch, mergeAndRank } from "../analysis/clusterer.js";
import { formatReport } from "../report/formatter.js";
import { writeFileSync } from "node:fs";

export interface CliOptions {
  state: string;
  labels?: string[];
  since?: string;
  limit: string;
  output?: string;
  model: string;
  batchSize: string;
  comments: boolean;
  verbose: boolean;
  dryRun: boolean;
  githubToken?: string;
  openaiKey?: string;
}

export async function runAnalysis(repo: string, options: CliOptions): Promise<void> {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    console.error(chalk.red('Error: Repository must be in "owner/name" format'));
    process.exit(1);
  }

  const githubToken = options.githubToken || process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error(chalk.red("Error: Set GITHUB_TOKEN or use --github-token"));
    process.exit(1);
  }

  const openaiKey = options.openaiKey || process.env.OPENAI_API_KEY;
  if (!options.dryRun && !openaiKey) {
    console.error(chalk.red("Error: Set OPENAI_API_KEY or use --openai-key"));
    process.exit(1);
  }

  const limit = parseInt(options.limit, 10);
  const batchSize = parseInt(options.batchSize, 10);

  // 1. Fetch issues
  const spinner = ora("Fetching issues...").start();
  const octokit = createGitHubClient(githubToken);

  const rawIssues = await fetchIssues(octokit, {
    owner,
    name,
    states: options.state === "all" ? undefined : [options.state.toUpperCase()],
    labels: options.labels,
    since: options.since,
    limit,
    onProgress: (count) => {
      spinner.text = `Fetched ${count} issues...`;
    },
  });

  if (rawIssues.length === 0) {
    spinner.warn("No issues found matching the specified filters.");
    return;
  }
  spinner.succeed(`Fetched ${rawIssues.length} issues from ${owner}/${name}`);

  // 2. Process issues
  const includeComments = options.comments;
  const processed: ProcessedIssue[] = rawIssues
    .map((raw) => transformIssue(cleanIssue(raw, includeComments), owner, name))
    .filter((issue): issue is ProcessedIssue => issue.body.length > 0 || issue.title.length > 0);

  if (options.verbose) {
    console.log(chalk.gray(`Processed ${processed.length} issues with content`));
  }

  if (options.dryRun) {
    console.log(chalk.cyan("\n--dry-run: Skipping LLM analysis"));
    console.log(`Issues fetched: ${rawIssues.length}`);
    console.log(`Issues with content: ${processed.length}`);
    const topIssues = processed.slice(0, 10);
    console.log(chalk.cyan("\nTop 10 by engagement:"));
    for (const issue of topIssues) {
      console.log(
        `  #${issue.number} [${issue.engagementScore}] ${issue.title} (${issue.state})`,
      );
    }
    return;
  }

  // 3. Chunk issues
  const batches = chunkIssues(processed, batchSize);
  if (options.verbose) {
    console.log(chalk.gray(`Split into ${batches.length} batch(es)`));
  }

  // 4. Phase 1: Batch clustering
  const allBatchResults = [];
  for (let i = 0; i < batches.length; i++) {
    const batchSpinner = ora(`Analyzing batch ${i + 1}/${batches.length}...`).start();
    try {
      const result = await analyzeBatch(
        batches[i],
        owner,
        name,
        options.model,
        openaiKey!,
      );
      allBatchResults.push(result);
      batchSpinner.succeed(
        `Batch ${i + 1}/${batches.length}: found ${result.painPoints.length} pain points`,
      );
    } catch (error) {
      batchSpinner.fail(`Batch ${i + 1} failed: ${error}`);
      throw error;
    }
  }

  // 5. Phase 2: Merge and rank
  const mergeSpinner = ora("Merging and ranking pain points...").start();
  let finalResult;
  if (allBatchResults.length === 1) {
    finalResult = allBatchResults[0];
  } else {
    finalResult = await mergeAndRank(allBatchResults, owner, name, options.model, openaiKey!);
  }
  mergeSpinner.succeed(`Identified ${finalResult.painPoints.length} pain points`);

  // 6. Generate report
  const report = formatReport(finalResult, {
    owner,
    name,
    totalIssues: processed.length,
    filters: {
      state: options.state,
      labels: options.labels,
      since: options.since,
    },
    model: options.model,
  });

  if (options.output) {
    writeFileSync(options.output, report, "utf-8");
    console.log(chalk.green(`\nReport saved to ${options.output}`));
  } else {
    console.log("\n" + report);
  }
}
