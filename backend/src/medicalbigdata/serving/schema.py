"""
Canonical feature schema for the CVD risk-prediction service.

This is the single source of truth shared by:
  - `train.py` (selects/orders these exact LURIC columns before fitting)
  - `predict.py` / `app.py` (validates & labels incoming feature dicts)
  - the Next.js frontend (`lib/featureSchema.ts` mirrors this list so the LLM
    extraction prompt asks for exactly these ids)

The id of every entry is the raw LURIC column name (SPSS/.sav variable), so
`train.py` can pull columns straight out of the dataframe returned by
`medicalbigdata.settings.luric.load_SAV`.

This module intentionally has ZERO dependencies on `medicalbigdata.settings`
(which needs pyreadstat + the actual dataset) so the FastAPI server can start
and serve `/schema` and `/health` even before a model is trained.

NOTE: label/unit values below are copied from
`medicalbigdata.settings.luric.LAB_MARKERS` / `COMORBIDITIES`. If those change,
update this file too.
"""
from typing import Literal, TypedDict


Category = Literal["demographic", "biomarker", "comorbidity"]


class FeatureSpec(TypedDict):
    id: str
    label: str
    unit: str
    category: Category


DEMOGRAPHIC_FEATURES: list[FeatureSpec] = [
    {"id": "age", "label": "Age", "unit": "years", "category": "demographic"},
    {"id": "sex", "label": "Sex", "unit": "1=male, 2=female", "category": "demographic"},
]

# code: (label, unit) -- copied from medicalbigdata.settings.luric.LAB_MARKERS
_LAB_MARKERS: dict[str, tuple[str, str]] = {
    'pbnpl1': ('NT-proBNP', 'ng/ml'),
    'tropt': ('troponin T', 'μg/L'),
    'il6': ('IL-6', 'ng/L'),
    'il6sens': ('IL-6 sensitive', 'ng/L'),
    'crp': ('CRP', 'mg/dL'),
    'tnf': ('TNF-α', 'ng/L'),
    'Galectin3': ('galectin-3', 'ng/mL'),
    'st2': ('soluble ST2', 'U/mL'),
    'ddimer': ('D-dimer', 'mg/L'),
    'fibrinog': ('fibrinogen', 'mg/dL'),
    'paiact': ('PAI-1 activity', 'U/mL'),
    'renin': ('renin', 'U/L'),
    'aldost': ('aldosterone', 'ng/L'),
    'homocys': ('homocysteine', 'μmol/L'),
    'cystatc': ('cystatin C', 'mg/L'),
    'albumin': ('albumin', 'g/dL'),
    'hba1c': ('HbA1c', '%'),
    'gluc0': ('glucose', 'mg/dL'),
    'urea': ('BUN', 'mg/dL'),
    'crea': ('creatinine', 'mg/dL'),
    'calcium': ('calcium', 'mmol/L'),
    'po4': ('phosphate', 'mg/dL'),
    'totbili': ('bilirubin', 'mg/dL'),
    'uricacid': ('uric acid', 'mg/dL'),
    'ldh': ('LDH', 'U/L'),
    'sgot': ('AST (SGOT)', 'U/L'),
    'sgpt': ('ALT (SGPT)', 'U/L'),
    'ap': ('alkaline phosphatase', 'U/L'),
    'totprot': ('total protein', 'g/dL'),
    'sodium': ('sodium', 'mmol/L'),
    'potass': ('potassium', 'mmol/L'),
    'magnes': ('magnesium', 'mmol/L'),
    'chol': ('cholesterol', 'mg/dL'),
    'hdlch': ('HDL-cholesterol', 'mg/dL'),
    'ldlch': ('LDL-cholesterol', 'mg/dL'),
    'tg': ('triglycerides', 'mg/dL'),
    'mdrdalt': ('eGFR', 'mL/min/1.73m²'),
    'hb': ('hemoglobin', 'g/dL'),
    'platelet': ('platelets', '/nL'),
    'inrquick': ('INR', ''),
    'aptt': ('aPTT', 'sec'),
    'hklvef': ('LVEF', '%'),
    'nyha': ('NYHA class', ''),
    'vitd25': ('25-OH vitamin D', 'μg/L'),
    'vitb12': ('vitamin B12', 'ng/L'),
    'folicac': ('folate', 'μg/L'),
}

# code: label -- copied from medicalbigdata.settings.luric.COMORBIDITIES
_COMORBIDITIES: dict[str, str] = {
    'dm1yn': 'type-1 diabetes',
    'dm2yn': 'type-2 diabetes',
    'hyptenyn': 'hypertension',
    'cadyn': 'coronary artery disease (CAD)',
    'strokeyn': 'stroke/TIA',
    'pvdyn': 'peripheral vascular disease (PVD)',
    'cmpyn': 'cardiomyopathy',
    'vdyn': 'valve disease',
    'rhythyn': 'arrhythmia',
    'COPDyn': 'chronic obstructive pulmonary disease (COPD)',
    'ASTHMAyn': 'asthma',
    'canceryn': 'cancer',
    'cvdanyyn': 'cerebrovascular disease (CBVD)',
    'smoke': 'smoking',
    'hfref_hfpef': 'heart failure',
    'afibyn': 'atrial fibrillation',
}

BIOMARKER_FEATURES: list[FeatureSpec] = [
    {"id": code, "label": label, "unit": unit, "category": "biomarker"}
    for code, (label, unit) in _LAB_MARKERS.items()
]

COMORBIDITY_FEATURES: list[FeatureSpec] = [
    {"id": code, "label": label, "unit": "0/1 (present or not)", "category": "comorbidity"}
    for code, label in _COMORBIDITIES.items()
]

FEATURE_SCHEMA: list[FeatureSpec] = DEMOGRAPHIC_FEATURES + BIOMARKER_FEATURES + COMORBIDITY_FEATURES

FEATURE_IDS: list[str] = [f["id"] for f in FEATURE_SCHEMA]
CATEGORICAL_FEATURE_IDS: list[str] = ["sex"] + [f["id"] for f in COMORBIDITY_FEATURES]
FEATURE_BY_ID: dict[str, FeatureSpec] = {f["id"]: f for f in FEATURE_SCHEMA}
