import type { RawIssue, RawComment } from "../github/types.js";

const BOT_AUTHORS = new Set([
  "dependabot",
  "dependabot[bot]",
  "github-actions",
  "github-actions[bot]",
  "stale",
  "stale[bot]",
  "renovate",
  "renovate[bot]",
]);

export interface CleanedIssue {
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
  url: string;
  author: string;
  labels: string[];
  reactionCount: number;
  comments: {
    totalCount: number;
    sample: RawComment[];
  };
  createdAt: string;
  updatedAt: string;
}

export function cleanIssue(raw: RawIssue, includeComments: boolean): CleanedIssue {
  const body = cleanText(raw.body || "");
  const filteredComments = includeComments
    ? (raw.comments.nodes || []).filter(
        (c) => !BOT_AUTHORS.has(c.author?.login?.toLowerCase() || ""),
      )
    : [];

  return {
    number: raw.number,
    title: raw.title,
    body: truncate(body, 2000),
    state: raw.state,
    url: raw.url,
    author: raw.author?.login || "unknown",
    labels: raw.labels.nodes.map((l) => l.name),
    reactionCount: raw.reactions.totalCount,
    comments: {
      totalCount: raw.comments.totalCount,
      sample: filteredComments.slice(0, 5).map((c) => ({
        ...c,
        body: truncate(cleanText(c.body), 500),
      })),
    },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function cleanText(text: string): string {
  return (
    text
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
