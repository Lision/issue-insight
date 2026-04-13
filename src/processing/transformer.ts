import type { CleanedIssue } from "./cleaner.js";

export interface ProcessedIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
  labels: string[];
  reactionCount: number;
  commentCount: number;
  commentSample: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
  engagementScore: number;
}

export function transformIssue(cleaned: CleanedIssue, owner: string, repo: string): ProcessedIssue {
  const engagementScore = cleaned.reactionCount + cleaned.comments.totalCount * 2;

  return {
    id: `${owner}/${repo}#${cleaned.number}`,
    number: cleaned.number,
    title: cleaned.title,
    body: cleaned.body,
    state: cleaned.state,
    labels: cleaned.labels,
    reactionCount: cleaned.reactionCount,
    commentCount: cleaned.comments.totalCount,
    commentSample: cleaned.comments.sample.map((c) => c.body),
    createdAt: cleaned.createdAt,
    updatedAt: cleaned.updatedAt,
    url: cleaned.url,
    engagementScore,
  };
}
