export const MODELS = ['gemini-3-flash-preview']

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
