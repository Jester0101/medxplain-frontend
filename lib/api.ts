import {
  AssessmentSchema,
  ChatResponseSchema,
  type Assessment,
  type AssessRequest,
  type ChatRequest,
  type ChatResponse,
} from "./contract";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function assess(req: AssessRequest): Promise<Assessment> {
  const res = await fetch(`${BASE}/api/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Assess failed: ${res.status}`);
  }
  return AssessmentSchema.parse(await res.json());
}

export async function askAssessmentChat(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Chat failed: ${res.status}`);
  }
  return ChatResponseSchema.parse(await res.json());
}
