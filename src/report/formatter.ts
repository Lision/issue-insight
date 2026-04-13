import type { MergedAnalysis, PainPoint } from "../analysis/schemas.js";
import type { BatchAnalysis } from "../analysis/schemas.js";

interface ReportMeta {
  owner: string;
  name: string;
  totalIssues: number;
  filters: {
    state?: string;
    labels?: string[];
    since?: string;
  };
  model: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function formatReport(
  result: MergedAnalysis | BatchAnalysis,
  meta: ReportMeta,
): string {
  const { owner, name, totalIssues, filters, model } = meta;
  const date = new Date().toISOString().split("T")[0];
  const painPoints = "summary" in result ? result.painPoints : result.painPoints;
  const summary = "summary" in result ? result.summary : undefined;

  const sorted = [...painPoints].sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    return b.frequency - a.frequency;
  });

  const filterParts: string[] = [];
  if (filters.state) filterParts.push(`state=${filters.state}`);
  if (filters.labels?.length) filterParts.push(`labels=${filters.labels.join(",")}`);
  if (filters.since) filterParts.push(`since=${filters.since}`);
  const filterDesc = filterParts.length > 0 ? ` (${filterParts.join(", ")})` : "";

  // Category distribution
  const categoryCounts = new Map<string, number>();
  for (const p of sorted) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
  }
  const categoryRows = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => {
      const pct = ((count / sorted.length) * 100).toFixed(0);
      return `| ${cat} | ${count} | ${pct}% |`;
    })
    .join("\n");

  const lines: string[] = [
    `# Pain Point Analysis: ${owner}/${name}`,
    ``,
    `**Generated:** ${date} | **Issues Analyzed:** ${totalIssues}${filterDesc} | **Model:** ${model}`,
    ``,
  ];

  if (summary) {
    lines.push(`## Executive Summary`, ``, summary, ``);
  }

  lines.push(`## Pain Points by Priority`, ``);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const sevLabel = p.severity.toUpperCase();
    const confTag = "confidence" in p ? ` | **Confidence:** ${p.confidence}` : "";

    lines.push(`### ${i + 1}. ${p.title} [${sevLabel}]`);
    lines.push(
      `**Category:** ${p.category} | **Frequency:** ${p.frequency} issues${confTag}`,
    );
    lines.push(``, p.description, ``);

    if (p.affectedUserSegments.length > 0) {
      lines.push(`**Affected users:** ${p.affectedUserSegments.join(", ")}`);
      lines.push(``);
    }

    if (p.representativeIssues.length > 0) {
      lines.push(`**Representative issues:**`);
      for (const ri of p.representativeIssues) {
        lines.push(`- [#${ri.number}](https://github.com/${owner}/${name}/issues/${ri.number}) — ${ri.reason}`);
      }
      lines.push(``);
    }

    lines.push(`---`, ``);
  }

  if (categoryRows) {
    lines.push(`## Pain Point Distribution`, ``);
    lines.push(`| Category | Count | Percentage |`);
    lines.push(`|---|---|---|`);
    lines.push(categoryRows, ``);
  }

  lines.push(`## Methodology`, ``);
  lines.push(
    `- Source: GitHub Issues from ${owner}/${name}`,
    `- Filters: ${filterDesc || "none"}`,
    `- Analysis model: ${model}`,
    `- Issues processed: ${totalIssues}`,
  );

  return lines.join("\n");
}
