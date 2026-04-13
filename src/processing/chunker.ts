import type { ProcessedIssue } from "./transformer.js";

export function chunkIssues(
  issues: ProcessedIssue[],
  maxIssuesPerBatch: number = 100,
): ProcessedIssue[][] {
  const sorted = [...issues].sort((a, b) => b.engagementScore - a.engagementScore);

  const batches: ProcessedIssue[][] = [];

  for (let i = 0; i < sorted.length; i += maxIssuesPerBatch) {
    batches.push(sorted.slice(i, i + maxIssuesPerBatch));
  }

  return batches;
}
