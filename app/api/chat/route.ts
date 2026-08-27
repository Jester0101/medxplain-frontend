import { NextResponse } from "next/server";
import { ChatRequestSchema } from "@/lib/contract";
import { explainAssessmentWithLLM } from "@/lib/llm";

type Bucket = { count: number; resetAt: number };
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const buckets = new Map<string, Bucket>();

function getClientId(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const current = buckets.get(clientId);
  if (!current || now > current.resetAt) {
    buckets.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  buckets.set(clientId, current);
  return current.count > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  const clientId = getClientId(req);
  if (isRateLimited(clientId)) {
    return NextResponse.json({ error: "Too many chat requests. Please retry shortly." }, { status: 429 });
  }

  const parsed = ChatRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { question, patient_context: patientContext, history, model } = parsed.data;

  try {
    const response = await explainAssessmentWithLLM(question, patientContext, model, history ?? []);
    console.info("[chat] answered", { inScope: response.inScope, turns: history?.length ?? 0 });
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat] failed", { message });
    if (message.includes("(429)")) {
      return NextResponse.json({ error: "LLM provider is rate limited. Please retry in a moment." }, { status: 429 });
    }
    if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
      return NextResponse.json({ error: "Chat request timed out. Please try again." }, { status: 504 });
    }
    if (message.includes("contained no text") || message.includes("JSON")) {
      return NextResponse.json({ error: "Invalid model response. Please retry." }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
