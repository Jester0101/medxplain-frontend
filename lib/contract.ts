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

export const ChatPatientContextSchema = z.object({
  patient_profile: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  risk_score: z.string(),
  risk_drivers_positive: z.array(z.string()),
  risk_drivers_negative: z.array(z.string()),
  clinical_summary: z.string(),
});
export type ChatPatientContext = z.infer<typeof ChatPatientContextSchema>;

export const ChatRequestSchema = z.object({
  question: z.string().min(2).max(1000),
  patient_context: ChatPatientContextSchema,
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  inScope: z.boolean(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ModelInfoSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  family: z.string().optional(),
  available: z.boolean().optional(),
  note: z.string().optional(),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const ModelsResponseSchema = z.object({
  models: z.array(ModelInfoSchema).min(1),
});
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;

export function signedValue(f: Factor): number {
  if (typeof f.shapValue === "number") return f.shapValue;
  return f.direction === "up" ? f.importance : -f.importance;
}
