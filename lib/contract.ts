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

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatAttributionSchema = z.object({
  name: z.string(),
  value: z.string(),
  contribution: z.number(),
  impact: z.string(),
});
export type ChatAttribution = z.infer<typeof ChatAttributionSchema>;

export const ChatPatientContextSchema = z.object({
  patient_profile: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  risk_score: z.string(),
  risk_value: z.number().optional(),
  base_value: z.number().optional(),
  risk_drivers_positive: z.array(z.string()),
  risk_drivers_negative: z.array(z.string()),
  attributions: z.array(ChatAttributionSchema).optional(),
  clinical_note: z.string().optional(),
  clinical_summary: z.string(),
});
export type ChatPatientContext = z.infer<typeof ChatPatientContextSchema>;

export const ChatRequestSchema = z.object({
  question: z.string().min(2).max(1000),
  patient_context: ChatPatientContextSchema,
  history: z.array(ChatMessageSchema).max(20).optional(),
  model: z.string().optional(),
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

export function baseValueOf(a: Assessment): number {
  return a.baseValue ?? 0.06;
}

export function riskValueOf(a: Assessment): number {
  if (typeof a.riskValue === "number") return a.riskValue;
  const parsed = parseFloat(a.riskScore);
  return Number.isFinite(parsed) ? parsed / 100 : baseValueOf(a);
}

export type Attribution = { factor: Factor; phi: number };

export type AttributionSet = {
  base: number;
  risk: number;
  items: Attribution[];
  residual: number;
  exact: boolean;
};

const AXIOM_TOLERANCE = 0.005;

export function attributionsOf(a: Assessment): AttributionSet {
  const base = baseValueOf(a);
  const risk = riskValueOf(a);
  const factors = a.factors;
  if (factors.length === 0) {
    return { base, risk, items: [], residual: risk - base, exact: false };
  }

  const raw = factors.map(signedValue);
  const gap = risk - base;
  const sum = raw.reduce((s, v) => s + v, 0);
  const absSum = raw.reduce((s, v) => s + Math.abs(v), 0);

  let scaled: number[];
  if (factors.every((f) => typeof f.shapValue === "number")) {
    scaled = raw;
  } else if (Math.abs(sum) > 1e-9 && Math.sign(sum) === Math.sign(gap)) {
    scaled = raw.map((v) => (v * gap) / sum);
  } else if (absSum > 1e-9) {
    scaled = raw.map((v) => (v * Math.abs(gap)) / absSum);
  } else {
    scaled = raw.map(() => 0);
  }

  const residual = gap - scaled.reduce((s, v) => s + v, 0);
  return {
    base,
    risk,
    items: factors.map((factor, i) => ({ factor, phi: scaled[i] })),
    residual,
    exact: Math.abs(residual) < AXIOM_TOLERANCE,
  };
}

export function attributionMap(a: Assessment): Map<Factor, number> {
  return new Map(attributionsOf(a).items.map(({ factor, phi }) => [factor, phi]));
}

export function formatPp(value: number, scale: number[]): string {
  const max = Math.max(0, ...scale.map((v) => Math.abs(v)));
  const decimals = max * 100 < 1 ? 2 : 1;
  return (Math.abs(value) * 100).toFixed(decimals);
}
