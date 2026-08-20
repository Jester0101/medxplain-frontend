import {
  AssessmentSchema,
  ChatResponseSchema,
  ModelsResponseSchema,
  type Assessment,
  type AssessRequest,
  type ChatRequest,
  type ChatResponse,
  type ModelInfo,
} from "./contract";
import { MODEL_CATALOGUE } from "./presets";

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

/**
 * Asks the backend which models it can serve. Falls back to the local catalogue
 * (all marked unavailable) so the picker still renders when the API is down.
 */
export async function listModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${BASE}/api/models`);
    if (!res.ok) throw new Error(String(res.status));
    return ModelsResponseSchema.parse(await res.json()).models;
  } catch {
    return MODEL_CATALOGUE.map((m) => ({ ...m, available: false }));
  }
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
