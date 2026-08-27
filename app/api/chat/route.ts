import { NextResponse } from "next/server";
import { ChatRequestSchema } from "@/lib/contract";
import { explainAssessmentWithLLM } from "@/lib/llm";
import { clientFacingError } from "@/lib/apiErrors";
import { RateLimiter, clientIdOf, readJsonBody } from "@/lib/rateLimit";

const limiter = new RateLimiter(20, 60_000);

export async function POST(req: Request) {
  if (limiter.exceeded(clientIdOf(req))) {
    return NextResponse.json({ error: "Too many chat requests. Please retry shortly." }, { status: 429 });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Request does not match the expected shape." }, { status: 400 });
  }

  const { question, patient_context: patientContext, history, model } = parsed.data;

  try {
    const response = await explainAssessmentWithLLM(question, patientContext, model, history ?? []);
    console.info("[chat] answered", { inScope: response.inScope, turns: history?.length ?? 0 });
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat] failed:", message);
    const { status, error } = clientFacingError(message);
    return NextResponse.json({ error }, { status });
  }
}
