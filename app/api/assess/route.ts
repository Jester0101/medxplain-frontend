import { NextResponse } from "next/server";
import { type Assessment, AssessRequestSchema } from "@/lib/contract";
import { assessWithLLM, extractFeaturesWithLLM } from "@/lib/llm";
import { isTrainedModelAvailable, predictWithTrainedModel, summarizeFactors } from "@/lib/predictClient";

/**
 * Prefers the real trained model (backend/ FastAPI service, see backend/SERVING.md) when
 * it's running and has a model loaded: note -> LLM feature extraction -> CatBoost + SHAP.
 * Falls back to a pure LLM estimate (lib/llm.ts assessWithLLM) when the service isn't
 * reachable or hasn't been trained yet -- this is the only fallback; there is no mock.
 */
async function assessWithTrainedModel(note: string, model?: string): Promise<Assessment> {
  const features = await extractFeaturesWithLLM(note, model);
  const prediction = await predictWithTrainedModel(features);
  return {
    riskScore: `${Math.round(prediction.riskValue * 100)}%`,
    riskValue: prediction.riskValue,
    baseValue: prediction.baseValue,
    factors: prediction.factors,
    summary: summarizeFactors(prediction.riskValue, prediction.factors),
    model: `catboost+${model ?? "llm-extraction"}`,
  };
}

export async function POST(req: Request) {
  const parsed = AssessRequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { note, model } = parsed.data;

  try {
    const useTrainedModel = await isTrainedModelAvailable();
    const assessment = useTrainedModel
      ? await assessWithTrainedModel(note, model)
      : await assessWithLLM(note, model);
    return NextResponse.json(assessment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[assess] failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
