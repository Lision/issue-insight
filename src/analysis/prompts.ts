import type { ProcessedIssue } from "../processing/transformer.js";

export const BATCH_SYSTEM_PROMPT = `You are a product analyst examining GitHub issues to identify user pain points.

Your task:
1. Group related issues into pain point clusters. Issues about the same underlying problem should be in one cluster.
2. For each cluster, provide a clear title, description, category, and severity assessment.
3. Identify the 2-3 most representative issues for each cluster.
4. Consider engagement signals (reaction counts, comment counts) when assessing severity — issues with high engagement indicate widespread pain.
5. Look beyond surface-level descriptions. A "crash on startup" and "blank screen after update" may share a root cause.

Guidelines:
- Aim for 5-15 clusters per batch. Merge related themes rather than creating overly specific clusters.
- Severity should reflect user impact, not just bug criticality. A confusing UX affecting many users may be "high" severity.
- Ignore meta-issues (CI failures, internal process issues) unless they clearly impact end users.`;

export function buildBatchUserPrompt(
  issues: ProcessedIssue[],
  owner: string,
  repo: string,
): string {
  const issueTexts = issues.map(formatIssueForPrompt).join("\n---\n");

  return `Analyze the following ${issues.length} GitHub issues from ${owner}/${repo}.
Identify and cluster the pain points described by users.

${issueTexts}

Respond with a JSON object containing a "painPoints" array.`;
}

function formatIssueForPrompt(issue: ProcessedIssue): string {
  const labels = issue.labels.join(", ") || "none";
  const comments =
    issue.commentSample.length > 0
      ? `\n#### Top Comments:\n${issue.commentSample.join("\n")}`
      : "";

  return `### Issue #${issue.number}: ${issue.title}
- State: ${issue.state} | Labels: ${labels} | Reactions: ${issue.reactionCount} | Comments: ${issue.commentCount}
- Created: ${issue.createdAt} | Updated: ${issue.updatedAt}
- URL: ${issue.url}

${issue.body}${comments}`;
}

export const MERGE_SYSTEM_PROMPT = `You are a senior product manager synthesizing pain point analyses from multiple batches of GitHub issues.

Your task:
1. Merge similar clusters that appeared across different batches. Two clusters about "slow performance" and "timeout errors" might represent the same underlying issue.
2. Aggregate frequencies — the total frequency is the sum of frequencies across batches.
3. Rank pain points by composite priority: severity * frequency * confidence.
4. Provide an executive summary.

Guidelines:
- Deduplicate aggressively. It is better to have fewer, well-defined clusters than many overlapping ones.
- Preserve specific representative issues — these are the most actionable output.
- If a pain point appeared in multiple batches with high severity, it is likely a critical issue.`;

export function buildMergeUserPrompt(
  batchResults: { painPoints: unknown[] }[],
  owner: string,
  repo: string,
  totalIssues: number,
): string {
  const batchTexts = batchResults
    .map(
      (result, i) =>
        `Batch ${i + 1} results:\n${JSON.stringify(result, null, 2)}`,
    )
    .join("\n\n");

  return `Merge and rank these pain point analyses from ${batchResults.length} batches (total ${totalIssues} issues from ${owner}/${repo}):

${batchTexts}

Produce a final ranked list of pain points with an executive summary.`;
}
