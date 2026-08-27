import { NextResponse } from "next/server";
import { type Assessment, AssessRequestSchema } from "@/lib/contract";
import { assessWithLLM, extractFeaturesWithLLM } from "@/lib/llm";
import { isTrainedModelAvailable, predictWithTrainedModel, summarizeFactors } from "@/lib/predictClient";
import { clientFacingError } from "@/lib/apiErrors";
import { RateLimiter, clientIdOf, readJsonBody } from "@/lib/rateLimit";

const limiter = new RateLimiter(10, 60_000);

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
  if (limiter.exceeded(clientIdOf(req))) {
    return NextResponse.json({ error: "Too many assessments. Please retry shortly." }, { status: 429 });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = AssessRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Request does not match the expected shape." }, { status: 400 });
  }

  const { note, model } = parsed.data;

  try {
    const assessment = (await isTrainedModelAvailable())
      ? await assessWithTrainedModel(note, model)
      : await assessWithLLM(note, model);
    return NextResponse.json(assessment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[assess] failed:", message);
    const { status, error } = clientFacingError(message);
    return NextResponse.json({ error }, { status });
  }
}
