import type { ModelInfo } from './contract'

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

export type PatientPreset = {
  id: number
  label: string
  risk: 'low' | 'moderate' | 'high'
  expectedRisk: number
  note: string
}

export const PATIENT_PRESETS: PatientPreset[] = [
  {
    id: 133,
    label: 'Patient #134 — 22yo male',
    risk: 'low',
    expectedRisk: 28.5,
    note: '22yo man with arrhythmia. ALT mildly elevated, BUN 22 mg/dL, alkaline phosphatase borderline high, 25-OH vitamin D 18 ng/mL. No major cardiovascular conditions, non-smoker.'
  },
  {
    id: 152,
    label: 'Patient #153 — 55yo male',
    risk: 'low',
    expectedRisk: 38.5,
    note: '55yo man, BUN 28 mg/dL, LDL cholesterol 142 mg/dL, NT-proBNP 85 pg/mL, 25-OH vitamin D 15 ng/mL. No history of coronary artery disease or heart failure. Non-smoker.'
  },
  {
    id: 115,
    label: 'Patient #116 — 60yo female',
    risk: 'moderate',
    expectedRisk: 72.5,
    note: '60yo woman, current smoker, NYHA class II symptoms. BUN 32 mg/dL, IL-6 elevated at 8.2 pg/mL. No history of coronary artery disease.'
  },
  {
    id: 49,
    label: 'Patient #50 — 53yo male',
    risk: 'moderate',
    expectedRisk: 82,
    note: '53yo man, current smoker. NT-proBNP 620 pg/mL, HDL 32 mg/dL, CRP 5.8 mg/L. No history of coronary artery disease or heart failure.'
  },
  {
    id: 3,
    label: 'Patient #4 — 75yo male',
    risk: 'high',
    expectedRisk: 92,
    note: '75yo man with coronary artery disease, hypertension, and type-2 diabetes. Current smoker. Age is a significant independent risk factor.'
  },
  {
    id: 5,
    label: 'Patient #6 — 54yo male',
    risk: 'high',
    expectedRisk: 98,
    note: '54yo man with heart failure and coronary artery disease. NT-proBNP 4200 pg/mL, LVEF 22%, eGFR 38 mL/min. Severely reduced cardiac function with kidney impairment.'
  }
]
