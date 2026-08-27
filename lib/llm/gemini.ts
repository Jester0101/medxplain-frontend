const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

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

export function extractJson(text: string): unknown {
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
    }
  }
  throw new Error(`Model returned invalid JSON: ${trimmed.slice(0, 240)}`)
}

export async function apiErrorMessage(
  res: Response,
  provider: string
): Promise<string> {
  const raw = await res.text()
  try {
    const parsed = JSON.parse(raw)
    const msg: string | undefined = parsed?.error?.message
    if (msg) return `${provider} (${res.status}): ${msg}`
  } catch {
  }
  return `${provider} request failed: ${res.status} ${raw.slice(0, 300)}`
}

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview'
const GEMINI_MODEL_ID = /^gemini[a-z0-9.-]*$/i

function stripProviderPrefix(model?: string): string | undefined {
  return model ? model.replace(/^gemini:/i, '') : undefined
}

function isSupportedGeminiModel(id: string | undefined): id is string {
  return !!id && GEMINI_MODEL_ID.test(id) && !id.includes('..')
}

export function resolveGeminiModel(requestedModel?: string): string {
  const requested = stripProviderPrefix(requestedModel)
  if (requested !== undefined && !isSupportedGeminiModel(requested)) {
    throw new Error('Only Gemini models are supported')
  }
  const fallback = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL
  return requested ?? (isSupportedGeminiModel(fallback) ? fallback : DEFAULT_GEMINI_MODEL)
}

export function resolveChatModel(requestedModel?: string): string {
  const requested = stripProviderPrefix(requestedModel)
  if (isSupportedGeminiModel(requested)) return requested
  const fallback = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL
  return isSupportedGeminiModel(fallback) ? fallback : DEFAULT_GEMINI_MODEL
}


export async function callGemini(
  model: string,
  prompt: string,
  generationConfig: Record<string, unknown>,
  timeoutMs?: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig
    })
  })

  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Gemini'))

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini response contained no text')
  return text
}
