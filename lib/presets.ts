// Models that actually drive the request today (routed straight to Gemini, see lib/llm.ts).
// Only list models confirmed to work on the free tier for the configured GEMINI_API_KEY —
// e.g. gemini-2.5-pro/2.0-flash returned RESOURCE_EXHAUSTED (quota 0) for this project.
export const ACTIVE_MODELS = ["gemini-2.5-flash"];

// Kept for later (would need OPENROUTER_API_KEY + a matching OpenRouter model id to work).
// Selecting one of these today silently falls back to the default Gemini model instead of failing.
export const PLANNED_MODELS = [
  "google/medgemma-27b-it",
  "google/medgemma-4b-it",
  "m42-health/Llama3-Med42-8B",
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
];

export const MODELS = [...ACTIVE_MODELS, ...PLANNED_MODELS];

export const PRESETS: { label: string; risk: "low" | "moderate" | "high"; note: string }[] = [
  { label: "Low", risk: "low",
    note: "45yo woman, non-smoker, LDL 95 mg/dL, HDL 62 mg/dL, HbA1c 5.2%, no conditions." },
  { label: "Moderate", risk: "moderate",
    note: "60yo man with hypertension, cholesterol 220 mg/dL, HDL 45 mg/dL, HbA1c 6.1%, CRP 3.4 mg/L." },
  { label: "High", risk: "high",
    note: "68yo man with diabetes and heart failure, LDL 190 mg/dL, HDL 30 mg/dL, CRP 8.5 mg/L, NT-proBNP 1800 pg/mL, creatinine 2.1 mg/dL, current smoker." },
];
