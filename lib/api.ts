import { AssessmentSchema, type Assessment, type AssessRequest } from "./contract";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function assess(req: AssessRequest): Promise<Assessment> {
  const res = await fetch(`${BASE}/api/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Assess failed: ${res.status}`);
  return AssessmentSchema.parse(await res.json());
}
