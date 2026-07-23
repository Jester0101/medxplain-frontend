import { z } from "zod";

export const Category = z.enum(["demographic", "biomarker", "comorbidity"]);
export type Category = z.infer<typeof Category>;

export const Direction = z.enum(["up", "down"]);
export type Direction = z.infer<typeof Direction>;

export const FactorSchema = z.object({
  name: z.string(),
  value: z.string(),
  category: Category,
  direction: Direction,
  importance: z.number().min(0).max(1),
  impact: z.string(),
  shapValue: z.number().optional(),
});
export type Factor = z.infer<typeof FactorSchema>;

export const AssessmentSchema = z.object({
  riskScore: z.string(),
  riskValue: z.number().min(0).max(1).optional(),
  baseValue: z.number().min(0).max(1).optional(),
  factors: z.array(FactorSchema),
  summary: z.string(),
  model: z.string().optional(),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const AssessRequestSchema = z.object({
  note: z.string().min(1),
  model: z.string().optional(),
});
export type AssessRequest = z.infer<typeof AssessRequestSchema>;

export function signedValue(f: Factor): number {
  if (typeof f.shapValue === "number") return f.shapValue;
  return f.direction === "up" ? f.importance : -f.importance;
}
