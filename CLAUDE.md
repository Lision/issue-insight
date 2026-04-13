# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI tool that analyzes GitHub issues from a specified repository, clusters user pain points, and ranks them by priority. Uses GitHub GraphQL API for data fetching and OpenAI API for analysis.

## Commands

```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Run tests
npx vitest run

# Dev run (dry-run, no LLM cost)
npx tsx bin/cli.ts owner/repo --dry-run --limit 10

# Full analysis
npx tsx bin/cli.ts owner/repo --limit 50 -o report.md
```

## Architecture

**Data flow:** CLI → GitHub Fetcher → Cleaner → Transformer → Chunker → LLM Clusterer → Ranker → Report Formatter

Four domain modules in `src/`:
- `github/` — Octokit GraphQL client, issue fetching with pagination (`fetcher.ts` is the main entry)
- `processing/` — `cleaner.ts` (strip HTML/bots/truncate), `transformer.ts` (flatten + engagementScore), `chunker.ts` (split by batch size, sorted by engagement)
- `analysis/` — Two-phase LLM: `clusterer.ts` runs per-batch clustering (Phase 1), then `mergeAndRank` deduplicates across batches (Phase 2). Prompts in `prompts.ts`, schemas in `schemas.ts`
- `report/` — Markdown report generation from analysis results

CLI flags → `src/config/index.ts` (`runAnalysis`) orchestrates the full pipeline.

## Key Design Decisions

- **GraphQL over REST**: single query fetches issues + labels + reactions + comments (REST would need N+1 calls)
- **Two-phase LLM analysis**: batch clustering then merge prevents attention dilution on large issue sets
- **Engagement score** (`reactions + comments*2`) sorts issues so `--limit` truncation keeps the most impactful ones
- Issues ordered by comment count (GitHub `orderBy`) so highest-discussion issues are fetched first
- Structured output via `response_format: { type: "json_object" }` + Zod validation
