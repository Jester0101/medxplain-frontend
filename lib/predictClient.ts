import { z } from "zod";
import { Category, Direction } from "./contract";

const RISK_MODEL_URL = process.env.RISK_MODEL_URL ?? "http://localhost:8000";

const ModelFactorSchema = z.object({
  name: z.string(),
  value: z.string(),
  category: Category,
  direction: Direction,
  importance: z.number().min(0).max(1),
  impact: z.string(),
  shapValue: z.number().optional(),
});

const ModelPredictionSchema = z.object({
  riskValue: z.number().min(0).max(1),
  baseValue: z.number().min(0).max(1),
  factors: z.array(ModelFactorSchema),
});
export type ModelPrediction = z.infer<typeof ModelPredictionSchema>;

export async function isTrainedModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${RISK_MODEL_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.model_loaded === true;
  } catch {
    return false;
  }
}

export function summarizeFactors(riskValue: number, factors: ModelPrediction["factors"]): string {
  const up = factors.filter((f) => f.direction === "up").slice(0, 3).map((f) => f.name);
  const down = factors.filter((f) => f.direction === "down").slice(0, 2).map((f) => f.name);
  const level = riskValue > 0.2 ? "high" : riskValue > 0.1 ? "moderate" : "low";
  let s = `Estimated 1-year CVD risk: ${level} (${Math.round(riskValue * 100)}%), from the trained model.`;
  if (up.length) s += ` Highest-impact factors: ${up.join(", ")}.`;
  if (down.length) s += ` Offsetting factors: ${down.join(", ")}.`;
  return s;
}

export async function predictWithTrainedModel(
  features: Record<string, number | string | null>
): Promise<ModelPrediction> {
  const res = await fetch(`${RISK_MODEL_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Risk model predict failed: ${res.status}`);
  }
  return ModelPredictionSchema.parse(await res.json());
}
