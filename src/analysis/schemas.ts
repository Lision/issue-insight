import { z } from "zod";

const RepresentativeIssueSchema = z.object({
  number: z.number(),
  reason: z.string(),
});

export const PainPointSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum([
    "bug",
    "performance",
    "ux",
    "documentation",
    "missing_feature",
    "configuration",
    "compatibility",
    "other",
  ]),
  frequency: z.number(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  representativeIssues: z.array(RepresentativeIssueSchema),
  affectedUserSegments: z.array(z.string()),
});

export const BatchAnalysisSchema = z.object({
  painPoints: z.array(PainPointSchema),
});

export const MergedAnalysisSchema = z.object({
  painPoints: z.array(
    PainPointSchema.extend({
      frequency: z.number(),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  summary: z.string(),
});

export type BatchAnalysis = z.infer<typeof BatchAnalysisSchema>;
export type MergedAnalysis = z.infer<typeof MergedAnalysisSchema>;
export type PainPoint = z.infer<typeof PainPointSchema>;
