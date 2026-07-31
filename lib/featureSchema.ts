import type { Category } from "./contract";

/**
 * Mirrors backend/src/medicalbigdata/serving/schema.py -- keep both in sync.
 *
 * This is the canonical list of features the trained risk model understands.
 * The LLM extraction step (lib/llm.ts) asks for values against exactly these
 * ids, so whatever it finds in a clinical note can be sent straight to the
 * Python /predict endpoint.
 */
export type FeatureSpec = {
  id: string;
  label: string;
  unit: string;
  category: Category;
};

const DEMOGRAPHIC_FEATURES: FeatureSpec[] = [
  { id: "age", label: "Age", unit: "years", category: "demographic" },
  { id: "sex", label: "Sex", unit: "1=male, 2=female", category: "demographic" },
];

// code: [label, unit] -- copied from medicalbigdata.settings.luric.LAB_MARKERS
const LAB_MARKERS: Record<string, [string, string]> = {
  pbnpl1: ["NT-proBNP", "ng/ml"],
  tropt: ["troponin T", "μg/L"],
  il6: ["IL-6", "ng/L"],
  il6sens: ["IL-6 sensitive", "ng/L"],
  crp: ["CRP", "mg/dL"],
  tnf: ["TNF-α", "ng/L"],
  Galectin3: ["galectin-3", "ng/mL"],
  st2: ["soluble ST2", "U/mL"],
  ddimer: ["D-dimer", "mg/L"],
  fibrinog: ["fibrinogen", "mg/dL"],
  paiact: ["PAI-1 activity", "U/mL"],
  renin: ["renin", "U/L"],
  aldost: ["aldosterone", "ng/L"],
  homocys: ["homocysteine", "μmol/L"],
  cystatc: ["cystatin C", "mg/L"],
  albumin: ["albumin", "g/dL"],
  hba1c: ["HbA1c", "%"],
  gluc0: ["glucose", "mg/dL"],
  urea: ["BUN", "mg/dL"],
  crea: ["creatinine", "mg/dL"],
  calcium: ["calcium", "mmol/L"],
  po4: ["phosphate", "mg/dL"],
  totbili: ["bilirubin", "mg/dL"],
  uricacid: ["uric acid", "mg/dL"],
  ldh: ["LDH", "U/L"],
  sgot: ["AST (SGOT)", "U/L"],
  sgpt: ["ALT (SGPT)", "U/L"],
  ap: ["alkaline phosphatase", "U/L"],
  totprot: ["total protein", "g/dL"],
  sodium: ["sodium", "mmol/L"],
  potass: ["potassium", "mmol/L"],
  magnes: ["magnesium", "mmol/L"],
  chol: ["cholesterol", "mg/dL"],
  hdlch: ["HDL-cholesterol", "mg/dL"],
  ldlch: ["LDL-cholesterol", "mg/dL"],
  tg: ["triglycerides", "mg/dL"],
  mdrdalt: ["eGFR", "mL/min/1.73m²"],
  hb: ["hemoglobin", "g/dL"],
  platelet: ["platelets", "/nL"],
  inrquick: ["INR", ""],
  aptt: ["aPTT", "sec"],
  hklvef: ["LVEF", "%"],
  nyha: ["NYHA class", ""],
  vitd25: ["25-OH vitamin D", "μg/L"],
  vitb12: ["vitamin B12", "ng/L"],
  folicac: ["folate", "μg/L"],
};

// code: label -- copied from medicalbigdata.settings.luric.COMORBIDITIES
const COMORBIDITIES: Record<string, string> = {
  dm1yn: "type-1 diabetes",
  dm2yn: "type-2 diabetes",
  hyptenyn: "hypertension",
  cadyn: "coronary artery disease (CAD)",
  strokeyn: "stroke/TIA",
  pvdyn: "peripheral vascular disease (PVD)",
  cmpyn: "cardiomyopathy",
  vdyn: "valve disease",
  rhythyn: "arrhythmia",
  COPDyn: "chronic obstructive pulmonary disease (COPD)",
  ASTHMAyn: "asthma",
  canceryn: "cancer",
  cvdanyyn: "cerebrovascular disease (CBVD)",
  smoke: "smoking",
  hfref_hfpef: "heart failure",
  afibyn: "atrial fibrillation",
};

const BIOMARKER_FEATURES: FeatureSpec[] = Object.entries(LAB_MARKERS).map(([id, [label, unit]]) => ({
  id,
  label,
  unit,
  category: "biomarker" as const,
}));

const COMORBIDITY_FEATURES: FeatureSpec[] = Object.entries(COMORBIDITIES).map(([id, label]) => ({
  id,
  label,
  unit: "0/1 (present or not)",
  category: "comorbidity" as const,
}));

export const FEATURE_SCHEMA: FeatureSpec[] = [
  ...DEMOGRAPHIC_FEATURES,
  ...BIOMARKER_FEATURES,
  ...COMORBIDITY_FEATURES,
];

export const FEATURE_IDS: string[] = FEATURE_SCHEMA.map((f) => f.id);
