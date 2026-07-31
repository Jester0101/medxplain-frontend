import { z } from "zod";
import { Category, Direction, type Assessment } from "./contract";
import { FEATURE_SCHEMA } from "./featureSchema";

const LLMFactorSchema = z.object({
  name: z.string(),
  value: z.string(),
  category: Category,
  direction: Direction,
  importance: z.number().min(0).max(1),
  impact: z.string(),
  shapValue: z.number().optional(),
});

const LLMAssessmentSchema = z.object({
  riskValue: z.number().min(0).max(1),
  baseValue: z.number().min(0).max(1).optional(),
  factors: z.array(LLMFactorSchema),
  summary: z.string(),
});
type LLMAssessment = z.infer<typeof LLMAssessmentSchema>;

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    riskValue: { type: "NUMBER", description: "Overall 1-year CVD risk probability, 0 to 1." },
    baseValue: { type: "NUMBER", description: "Baseline population risk before this patient's factors, 0 to 1." },
    factors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          value: { type: "STRING" },
          category: { type: "STRING", enum: ["demographic", "biomarker", "comorbidity"] },
          direction: { type: "STRING", enum: ["up", "down"] },
          importance: { type: "NUMBER", description: "Relative contribution magnitude, 0 to 1." },
          impact: { type: "STRING" },
        },
        required: ["name", "value", "category", "direction", "importance", "impact"],
      },
    },
    summary: { type: "STRING" },
  },
  required: ["riskValue", "factors", "summary"],
};

function buildPrompt(note: string): string {
  return `You are a clinical decision-support assistant estimating 1-year cardiovascular disease (CVD) risk from a free-text clinical note.

Analyze the note below and identify every relevant risk factor explicitly mentioned (demographics like age/sex, biomarkers/labs, and comorbidities/conditions). For each factor, decide whether it raises ("up") or lowers ("down") the patient's risk relative to a healthy baseline, and estimate its relative importance (0 to 1).

Only include factors explicitly supported by the note. Sort factors by importance, descending.

Clinical note:
"""
${note}
"""

Respond with JSON only, no markdown fences, matching this shape:
{
  "riskValue": number (0-1, overall estimated 1-year CVD risk probability),
  "baseValue": number (0-1, baseline/prior risk before this patient's specific factors, typically 0.05-0.08),
  "factors": [
    {
      "name": string,
      "value": string,
      "category": "demographic" | "biomarker" | "comorbidity",
      "direction": "up" | "down",
      "importance": number (0-1),
      "impact": string (one sentence of clinical reasoning)
    }
  ],
  "summary": string (2-3 sentence plain-language summary of the overall risk and its key drivers)
}`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(trimmed);
}

async function apiErrorMessage(res: Response, provider: string): Promise<string> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    const msg: string | undefined = parsed?.error?.message;
    if (msg) return `${provider} (${res.status}): ${msg}`;
  } catch {
    // not JSON, fall through to raw text
  }
  return `${provider} request failed: ${res.status} ${raw.slice(0, 300)}`;
}

function toAssessment(parsed: LLMAssessment, modelLabel: string): Assessment {
  const factors = [...parsed.factors].sort((a, b) => b.importance - a.importance);
  return {
    riskScore: `${Math.round(parsed.riskValue * 100)}%`,
    riskValue: parsed.riskValue,
    baseValue: parsed.baseValue ?? 0.06,
    factors,
    summary: parsed.summary,
    model: modelLabel,
  };
}

async function assessWithGemini(note: string, model: string): Promise<Assessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(note) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(await apiErrorMessage(res, "Gemini"));

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response contained no text");

  const parsed = LLMAssessmentSchema.parse(extractJson(text));
  return toAssessment(parsed, `gemini:${model}`);
}

async function assessWithOpenRouter(note: string, model: string): Promise<Assessment> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": "MedXplain",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a clinical risk-assessment assistant. Always respond with strict JSON only, no markdown, no commentary.",
        },
        { role: "user", content: buildPrompt(note) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res, "OpenRouter"));

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter response contained no text");

  const parsed = LLMAssessmentSchema.parse(extractJson(text));
  return toAssessment(parsed, `openrouter:${model}`);
}

// --- Feature extraction (note -> structured values for the trained model) ---

const ExtractedFeaturesSchema = z.record(z.string(), z.union([z.number(), z.string(), z.null()]));

function buildExtractionPrompt(note: string): string {
  const featureList = FEATURE_SCHEMA.map((f) => `- ${f.id}: ${f.label}${f.unit ? ` (${f.unit})` : ""}`).join("\n");
  return `You extract structured clinical values from a free-text note for a cardiovascular risk model.

Given the list of feature ids below, output a JSON object containing ONLY the ids that are explicitly supported by the note. Do not guess or infer values that aren't stated. Do not include ids that aren't mentioned.

Value format:
- age: number of years
- sex: "1" for male, "2" for female
- biomarkers: plain numeric value in the given unit
- comorbidities: "1" if present/mentioned, "0" if explicitly stated absent (omit the id entirely if simply not mentioned)

Feature ids:
${featureList}

Clinical note:
"""
${note}
"""

Respond with a single flat JSON object only, e.g. {"age": 68, "sex": "1", "crp": 8.5, "dm2yn": "1"}. No markdown, no commentary, no nested objects.`;
}

async function extractFeaturesWithGemini(note: string, model: string): Promise<Record<string, number | string | null>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExtractionPrompt(note) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(await apiErrorMessage(res, "Gemini"));

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response contained no text");

  return ExtractedFeaturesSchema.parse(extractJson(text));
}

async function extractFeaturesWithOpenRouter(note: string, model: string): Promise<Record<string, number | string | null>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": "MedXplain",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You extract structured clinical data. Always respond with a single flat JSON object only, no markdown, no commentary.",
        },
        { role: "user", content: buildExtractionPrompt(note) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res, "OpenRouter"));

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter response contained no text");

  return ExtractedFeaturesSchema.parse(extractJson(text));
}

type Provider = "gemini" | "openrouter";

function resolveProvider(requestedModel?: string): { provider: Provider; model: string } | null {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const forced = process.env.LLM_PROVIDER as Provider | undefined;

  if (requestedModel?.toLowerCase().startsWith("gemini") && hasGemini) {
    return { provider: "gemini", model: requestedModel };
  }
  if (requestedModel && hasOpenRouter && (!forced || forced === "openrouter")) {
    return { provider: "openrouter", model: requestedModel };
  }
  if (forced === "gemini" && hasGemini) {
    return { provider: "gemini", model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" };
  }
  if (forced === "openrouter" && hasOpenRouter) {
    return { provider: "openrouter", model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini" };
  }
  if (hasGemini) return { provider: "gemini", model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" };
  if (hasOpenRouter) return { provider: "openrouter", model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini" };
  return null;
}

export async function assessWithLLM(note: string, requestedModel?: string): Promise<Assessment> {
  const resolved = resolveProvider(requestedModel);
  if (!resolved) throw new Error("No LLM provider configured (set GEMINI_API_KEY or OPENROUTER_API_KEY)");

  if (resolved.provider === "gemini") return assessWithGemini(note, resolved.model);
  return assessWithOpenRouter(note, resolved.model);
}

/** Note -> structured feature values (subset of lib/featureSchema.ts ids), for the trained model. */
export async function extractFeaturesWithLLM(
  note: string,
  requestedModel?: string
): Promise<Record<string, number | string | null>> {
  const resolved = resolveProvider(requestedModel);
  if (!resolved) throw new Error("No LLM provider configured (set GEMINI_API_KEY or OPENROUTER_API_KEY)");

  if (resolved.provider === "gemini") return extractFeaturesWithGemini(note, resolved.model);
  return extractFeaturesWithOpenRouter(note, resolved.model);
}
