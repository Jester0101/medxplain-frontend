import { z } from 'zod'
import { Category, Direction, type Assessment } from './contract'
import { FEATURE_SCHEMA } from './featureSchema'
import type { ChatPatientContext } from './contract'

const LLMFactorSchema = z.object({
  name: z.string(),
  value: z.string(),
  category: Category,
  direction: Direction,
  importance: z.number().min(0).max(1),
  impact: z.string(),
  shapValue: z.number().optional()
})

const LLMAssessmentSchema = z.object({
  riskValue: z.number().min(0).max(1),
  baseValue: z.number().min(0).max(1).optional(),
  factors: z.array(LLMFactorSchema),
  summary: z.string()
})
type LLMAssessment = z.infer<typeof LLMAssessmentSchema>

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    riskValue: {
      type: 'NUMBER',
      description: 'Overall 1-year CVD risk probability, 0 to 1.'
    },
    baseValue: {
      type: 'NUMBER',
      description:
        "Baseline population risk before this patient's factors, 0 to 1."
    },
    factors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          value: { type: 'STRING' },
          category: {
            type: 'STRING',
            enum: ['demographic', 'biomarker', 'comorbidity']
          },
          direction: { type: 'STRING', enum: ['up', 'down'] },
          importance: {
            type: 'NUMBER',
            description: 'Relative contribution magnitude, 0 to 1.'
          },
          impact: { type: 'STRING' }
        },
        required: [
          'name',
          'value',
          'category',
          'direction',
          'importance',
          'impact'
        ]
      }
    },
    summary: { type: 'STRING' }
  },
  required: ['riskValue', 'factors', 'summary']
}

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
}`
}

function firstBalancedJsonBlock(text: string): string | null {
  const start = text.search(/[\[{]/)
  if (start < 0) return null
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === open) depth += 1
    if (ch === close) {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  const candidates = [trimmed, firstBalancedJsonBlock(trimmed)].filter(
    (v): v is string => !!v
  )

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Model returned invalid JSON: ${trimmed.slice(0, 240)}`)
}

async function apiErrorMessage(
  res: Response,
  provider: string
): Promise<string> {
  const raw = await res.text()
  try {
    const parsed = JSON.parse(raw)
    const msg: string | undefined = parsed?.error?.message
    if (msg) return `${provider} (${res.status}): ${msg}`
  } catch {
    // not JSON, fall through to raw text
  }
  return `${provider} request failed: ${res.status} ${raw.slice(0, 300)}`
}

function toAssessment(parsed: LLMAssessment, modelLabel: string): Assessment {
  const factors = [...parsed.factors].sort(
    (a, b) => b.importance - a.importance
  )
  return {
    riskScore: `${Math.round(parsed.riskValue * 100)}%`,
    riskValue: parsed.riskValue,
    baseValue: parsed.baseValue ?? 0.06,
    factors,
    summary: parsed.summary,
    model: modelLabel
  }
}

async function assessWithGemini(
  note: string,
  model: string
): Promise<Assessment> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(note) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA
        }
      })
    }
  )
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Gemini'))

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response contained no text')

  const parsed = LLMAssessmentSchema.parse(extractJson(text))
  return toAssessment(parsed, `gemini:${model}`)
}

// --- Feature extraction (note -> structured values for the trained model) ---

const ExtractedFeaturesSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.null()])
)

function buildExtractionPrompt(note: string): string {
  const featureList = FEATURE_SCHEMA.map(
    f => `- ${f.id}: ${f.label}${f.unit ? ` (${f.unit})` : ''}`
  ).join('\n')
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

Respond with a single flat JSON object only, e.g. {"age": 68, "sex": "1", "crp": 8.5, "dm2yn": "1"}. No markdown, no commentary, no nested objects.`
}

async function extractFeaturesWithGemini(
  note: string,
  model: string
): Promise<Record<string, number | string | null>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExtractionPrompt(note) }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  )
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Gemini'))

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response contained no text')

  return ExtractedFeaturesSchema.parse(extractJson(text))
}

function resolveGeminiModel(requestedModel?: string): string {
  if (requestedModel && !requestedModel.toLowerCase().startsWith('gemini')) {
    throw new Error('Only Gemini models are supported')
  }
  return requestedModel ?? process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview'
}

export async function assessWithLLM(
  note: string,
  requestedModel?: string
): Promise<Assessment> {
  return assessWithGemini(note, resolveGeminiModel(requestedModel))
}

/** Note -> structured feature values (subset of lib/featureSchema.ts ids), for the trained model. */
export async function extractFeaturesWithLLM(
  note: string,
  requestedModel?: string
): Promise<Record<string, number | string | null>> {
  return extractFeaturesWithGemini(note, resolveGeminiModel(requestedModel))
}

const ChatAnswerSchema = z.object({
  answer: z.string().min(1).max(2000),
  inScope: z.boolean()
})

const CHAT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    inScope: { type: 'BOOLEAN' }
  },
  required: ['answer', 'inScope']
}

function buildChatPrompt(
  question: string,
  context: ChatPatientContext
): string {
  return `You are MedXplain, a clinical research support assistant.

Task:
- Explain already-calculated 1-year CVD risk assessment results using only the provided context.
- Audience is doctors/researchers.

Strict boundaries:
- You MUST NOT provide recommendations, treatment advice, diagnostics, prognostic claims beyond the provided score, or new clinical actions.
- You MUST NOT add external facts, guidelines, thresholds, or knowledge not present in the context.
- If the question is outside scope, reply with a short refusal and set inScope=false.
- If in scope, provide a concise explanation tied to risk score, risk drivers, and summary text only, and set inScope=true.

Return JSON only:
{
  "answer": string,
  "inScope": boolean
}

Patient context:
${JSON.stringify(context, null, 2)}

Question:
${question}`
}

export async function explainAssessmentWithGemini(
  question: string,
  context: ChatPatientContext,
  model: string
): Promise<{ answer: string; inScope: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildChatPrompt(question, context) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: CHAT_RESPONSE_SCHEMA
        }
      })
    }
  )

  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Gemini'))
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response contained no text')

  return ChatAnswerSchema.parse(extractJson(text))
}

export async function explainAssessmentWithLLM(
  question: string,
  context: ChatPatientContext,
  requestedModel?: string
): Promise<{ answer: string; inScope: boolean }> {
  return explainAssessmentWithGemini(
    question,
    context,
    resolveGeminiModel(requestedModel)
  )
}
