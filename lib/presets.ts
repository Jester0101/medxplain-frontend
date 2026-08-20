import type { ModelInfo } from './contract'

/**
 * The models this product intends to offer. The backend reports which of them it
 * can actually serve right now (GET /api/models); this list is only the fallback
 * used when that endpoint is unreachable.
 */
export const MODEL_CATALOGUE: ModelInfo[] = [
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (preview)',
    family: 'Gemini'
  },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', family: 'Gemini' },
  {
    id: 'google/medgemma-27b-it',
    label: 'MedGemma 27B Instruct',
    family: 'Self-hosted'
  },
  {
    id: 'google/medgemma-4b-it',
    label: 'MedGemma 4B Instruct',
    family: 'Self-hosted'
  },
  {
    id: 'm42-health/Llama3-Med42-8B',
    label: 'Med42 8B',
    family: 'Self-hosted'
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    label: 'Llama 3.1 8B Instruct',
    family: 'Self-hosted'
  }
]

export const MODELS = MODEL_CATALOGUE.map(m => m.id)

export const PRESETS: {
  label: string
  risk: 'low' | 'moderate' | 'high'
  note: string
}[] = [
  {
    label: 'Low',
    risk: 'low',
    note: '45yo woman, non-smoker, LDL 95 mg/dL, HDL 62 mg/dL, HbA1c 5.2%, no conditions.'
  },
  {
    label: 'Moderate',
    risk: 'moderate',
    note: '60yo man with hypertension, cholesterol 220 mg/dL, HDL 45 mg/dL, HbA1c 6.1%, CRP 3.4 mg/L.'
  },
  {
    label: 'High',
    risk: 'high',
    note: '68yo man with diabetes and heart failure, LDL 190 mg/dL, HDL 30 mg/dL, CRP 8.5 mg/L, NT-proBNP 1800 pg/mL, creatinine 2.1 mg/dL, current smoker.'
  }
]
