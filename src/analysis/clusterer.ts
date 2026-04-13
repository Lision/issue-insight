import OpenAI from "openai";
import type { ProcessedIssue } from "../processing/transformer.js";
import {
  BATCH_SYSTEM_PROMPT,
  MERGE_SYSTEM_PROMPT,
  buildBatchUserPrompt,
  buildMergeUserPrompt,
} from "./prompts.js";
import {
  BatchAnalysisSchema,
  MergedAnalysisSchema,
  type BatchAnalysis,
  type MergedAnalysis,
} from "./schemas.js";

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function analyzeBatch(
  issues: ProcessedIssue[],
  owner: string,
  repo: string,
  model: string,
  apiKey: string,
): Promise<BatchAnalysis> {
  const openai = createOpenAIClient(apiKey);
  const userPrompt = buildBatchUserPrompt(issues, owner, repo);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: BATCH_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return BatchAnalysisSchema.parse(parsed);
}

export async function mergeAndRank(
  batchResults: BatchAnalysis[],
  owner: string,
  repo: string,
  model: string,
  apiKey: string,
): Promise<MergedAnalysis> {
  const openai = createOpenAIClient(apiKey);
  const totalIssues = batchResults.reduce(
    (sum, r) => sum + r.painPoints.reduce((s, p) => s + p.frequency, 0),
    0,
  );
  const userPrompt = buildMergeUserPrompt(batchResults, owner, repo, totalIssues);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MERGE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return MergedAnalysisSchema.parse(parsed);
}
