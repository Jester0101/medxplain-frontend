# Put all LURIC-specific features here

import pyreadstat

from medicalbigdata.settings import *

# Lab values with units (corrected LURIC names)
LAB_MARKERS = {
    # Cardiac stress (Tier 1)
    'pbnpl1': ('NT-proBNP', 'ng/ml', 1),
    'tropt': ('troponin T', 'μg/L', 2),
    # Inflammation (Tier 1)
    'il6': ('IL-6', 'ng/L', 1),
    'il6sens': ('IL-6 sensitive', 'ng/L', 1),
    'crp': ('CRP', 'mg/dL', 1),
    'tnf': ('TNF-α', 'ng/L', 1),
    # Fibrosis/remodeling (Tier 1)
    'Galectin3': ('galectin-3', 'ng/mL', 1),
    'st2': ('soluble ST2', 'U/mL', 1),
    # Hemostatic (Tier 2)
    'ddimer': ('D-dimer', 'mg/L', 1),
    'fibrinog': ('fibrinogen', 'mg/dL', 0),
    'paiact': ('PAI-1 activity', 'U/mL', 1),
    # Neurohormonal (Tier 2)
    'renin': ('renin', 'U/L', 1),
    'aldost': ('aldosterone', 'ng/L', 0),
    'homocys': ('homocysteine', 'μmol/L', 1),
    # Top-20 predictors
    'cystatc': ('cystatin C', 'mg/L', 1),
    'albumin': ('albumin', 'g/dL', 1),
    'hba1c': ('HbA1c', '%', 1),
    'gluc0': ('glucose', 'mg/dL', 0),
    'urea': ('BUN', 'mg/dL', 0),
    'crea': ('creatinine', 'mg/dL', 1),
    'calcium': ('calcium', 'mmol/L', 1),
    'po4': ('phosphate', 'mg/dL', 1),
    'totbili': ('bilirubin', 'mg/dL', 1),
    'uricacid': ('uric acid', 'mg/dL', 1),
    'ldh': ('LDH', 'U/L', 0),
    'sgot': ('AST (SGOT)', 'U/L', 0),
    'sgpt': ('ALT (SGPT)', 'U/L', 0),
    'ap': ('alkaline phosphatase', 'U/L', 0),
    'totprot': ('total protein', 'g/dL', 1),
    'sodium': ('sodium', 'mmol/L', 0),
    'potass': ('potassium', 'mmol/L', 1),
    'magnes': ('magnesium', 'mmol/L', 1),
    # Optional lipids
    'chol': ('cholesterol', 'mg/dL', 0),
    # 'hdlchol': ('HDL-C', 'mg/dL', 0), # always NaN in Luric!
    'hdlch': ('HDL-cholesterol', 'mg/dL', 0),
    # 'ldlchol': ('LDL-C', 'mg/dL', 0), # always NaN in Luric!
    'ldlch': ('LDL-cholesterol', 'mg/dL', 0),
    'tg': ('triglycerides', 'mg/dL', 0),
    # Strong mortality predictors
    'mdrdalt': ('eGFR', 'mL/min/1.73m²', 0),
    'hb': ('hemoglobin', 'g/dL', 1),
    'platelet': ('platelets', '/nL', 0),
    'inrquick': ('INR', '', 2),
    'aptt': ('aPTT', 'sec', 1),
    'hklvef': ('LVEF', '%', 0),
    'nyha': ('NYHA class', '', 0),
    # Vitamins
    'vitd25': ('25-OH vitamin D', 'μg/L', 1),
    'vitb12': ('vitamin B12', 'ng/L', 0),
    'folicac': ('folate', 'μg/L', 1)
}

# Comprehensive list of comorbidities mentioned in LURIC
COMORBIDITIES = {
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
    # 'ckdyn': 'chronic kidney disease', # not in Luric!
    'hfref_hfpef': 'heart failure',  # renamed to Luric!
    'afibyn': 'atrial fibrillation',
    # 'malignancy': 'active cancer', # not in Luric!
    # 'anemia': 'anemia' # not in Luric!
}

# Dictionary of all relevant attributes for prompting from the LURIC codebook
LOOKUP_DICT = {}

# Diagnosis
LOOKUP_DICT["miyn"] = "myocardial infarction"
LOOKUP_DICT["mi012"] = "myocardial infarction"
LOOKUP_DICT["cvdanyyn"] = "any (atherosclerosis) cerebrovascular disease (CVD)"
LOOKUP_DICT["cvdotime"] = "time since first cerebrovascular surgery (days)"
LOOKUP_DICT["pvdanyyn"] = "any (atherosclerosis) peripheral vascular disease (PVD)"
LOOKUP_DICT["canceryn"] = "cancer"
LOOKUP_DICT["canctyp"] = "type of cancer"
LOOKUP_DICT["pvdyn"] = "peripheral vascular disease"
LOOKUP_DICT["pvdtime"] = "time since diagnosis of peripheral vascular disease (days)"
LOOKUP_DICT["dm1yn"] = "type-1 diabetes mellitus"
LOOKUP_DICT["dm2yn"] = "type-2 diabetes mellitus"
LOOKUP_DICT["dmtime"] = "time since diagnosis of diabetes (days)"
LOOKUP_DICT["venthrom"] = "venous thrombosis/pulmonary embolism"
LOOKUP_DICT["infectyn"] = "acute infectious disease"
LOOKUP_DICT["infectco"] = "type of infectious disease"
LOOKUP_DICT["uadef1"] = "unstable angina def.1 LURIC"
LOOKUP_DICT["uadef2"] = "unstable angina def.2 cath report"
LOOKUP_DICT["anginayn"] = "angina pectoris"
LOOKUP_DICT["angifreq"] = "angina frequency/type"
LOOKUP_DICT["hkap"] = "quality of angina (cath report)"
LOOKUP_DICT["hkua"] = "angina type"
LOOKUP_DICT["acs"] = "acute coronary syndrome (ACS)"
LOOKUP_DICT["rc"] = "result of exercise test (cath report)"
LOOKUP_DICT["afibyn"] = "atrial fibrillation"
LOOKUP_DICT["COPDyn"] = "chronic obstructive pulmonary disease (COPD)"
LOOKUP_DICT["ASTHMAyn"] = "asthma"

# Treatment
LOOKUP_DICT["insuthyn"] = "treatment with insulin"
LOOKUP_DICT["etp"] = "Endogenous thrombin potential"
LOOKUP_DICT["statinyn"] = "statin use"
LOOKUP_DICT["cseyn"] = "CSE inhibitor (statin)"
LOOKUP_DICT["lilo"] = "lipid lowering therapy"
LOOKUP_DICT["ass0n"] = "aspirin/other antiplatelet"

# Laboratory Test AND Predictions
LOOKUP_DICT["coro_diadtnt"] = "CoroPredict, diadexus, TnT"
LOOKUP_DICT["coro_diadlpp"] = "CoroPredict, diadexus, LpPLA2"
LOOKUP_DICT["coro_stactnt"] = "CoroPredict, stable CAD, TnT"
LOOKUP_DICT["coro_staclpp"] = "CoroPredict, stable CAD, LpPLA2"
LOOKUP_DICT["smart_score_prozent_stufen"] = "SMART risk score (level)"
LOOKUP_DICT["smart_score_prozent"] = "SMART risk score (percent)"
LOOKUP_DICT["p_pocoeq"] = "Pooled Cohort Equation"
LOOKUP_DICT["marschner_6y"] = "Marschner Score 6 years"
LOOKUP_DICT["marschner_5y"] = "Marschner Score 5 years"
LOOKUP_DICT["marschner_4y"] = "Marschner Score 4 years"
LOOKUP_DICT["marschner_3y"] = "Marschner Score 3 years"
LOOKUP_DICT["marschner_2y"] = "Marschner Score 2 years"
LOOKUP_DICT["marschner_1y"] = "Marschner Score 1 years"
LOOKUP_DICT["score2_risk_rescaled"] = ""
LOOKUP_DICT["p_esc"] = "10-year probability of fatal cardiovascular disease (percent)"

# Vital (Laboratory) Values
LOOKUP_DICT["age"] = "age"
LOOKUP_DICT["hb"] = "hemoglobin (g/dL)"
LOOKUP_DICT["leuco"] = "leucocytes (/nL)"
LOOKUP_DICT["avfgluc"] = "mean fasting glucose (serum/plasma) (mg/dL)"
LOOKUP_DICT["hba1c"] = "glycosylated hemoglobin (percent)"
LOOKUP_DICT["ech"] = "total cholesterol (EDTA) (mg/dL)"
LOOKUP_DICT["ldlch"] = "LDL cholesterol (EDTA) (mg/dL)"
LOOKUP_DICT["hdlch"] = "HDL cholesterol (EDTA) (mg/dL)"
LOOKUP_DICT["etg"] = "triglycerides (EDTA) (mg/dL)"
LOOKUP_DICT["albumin"] = "albumin (g/dL)"
LOOKUP_DICT["sgot"] = "SGOT (U/L)"
LOOKUP_DICT["sgpt"] = "SGPT (U/L)"
LOOKUP_DICT["ggt"] = "gamma GT (U/L)"
LOOKUP_DICT["crea"] = "creatinin (mg/dL, Jaffe)"
LOOKUP_DICT["crea_lcmsms2"] = "creatinine (mg/dL)"
LOOKUP_DICT["ckd_epi_gfr"] = "eGFR CKD_EPI Crea_Cys"
LOOKUP_DICT["uricacid"] = "uricacid (mg/dl)"
LOOKUP_DICT["potass"] = "potassium (mmol/L)"
LOOKUP_DICT["tsh"] = "TSH (mU/L)"
LOOKUP_DICT["inrquick"] = "INR (Quick)"
LOOKUP_DICT["aptt"] = "aPTT (sec)"
LOOKUP_DICT["supercrp"] = "supersensitive C-reactive protein (mg/L)"
LOOKUP_DICT["haptoglo"] = "haptoglobin (mg/dL)"

# Died
LOOKUP_DICT["death2010"] = ""
LOOKUP_DICT["death2020"] = ""

# Cause of Death
LOOKUP_DICT["death2010_c1"] = ""
LOOKUP_DICT["death2010_c1_1"] = "death from cardiac causes"
LOOKUP_DICT["death2010_c1_2"] = "fatal stroke"
LOOKUP_DICT["death2010_c1_3"] = "fatal infection"
LOOKUP_DICT["death2010_c1_4"] = "fatal cancer"
LOOKUP_DICT["death2010_c1_5"] = "other causes of death "
LOOKUP_DICT["death2010_c2"] = ""
LOOKUP_DICT["death2010_c2_1"] = "sudden death"
LOOKUP_DICT["death2010_c2_2"] = "fatal myocardial infarction"
LOOKUP_DICT["death2010_c2_3"] = "congestive heart failure"
LOOKUP_DICT["death2010_c2_4"] = "death after intervention to treat CAD"
LOOKUP_DICT["death2010_c2_5"] = "other causes of death"
LOOKUP_DICT["death2010_c3"] = ""
LOOKUP_DICT["death2010_c3_1"] = "death due to cardiovascular causes"
LOOKUP_DICT["death2010_c3_2"] = "death due to other causes"

# Time of death
LOOKUP_DICT["datedied"] = "date of death"
LOOKUP_DICT["deathdat"] = "date of death"
LOOKUP_DICT["deathdat2010"] = ""
LOOKUP_DICT["death36"] = "death within 36 months follow-up"
LOOKUP_DICT["obstime2010"] = "observation time (years) "
LOOKUP_DICT["obstime2020"] = "observation time (years) "

# All Additions
LOOKUP_DICT["cadyn"] = "coronary artery disease (CAD) (risk of >10%/20% or clinical)"
LOOKUP_DICT["sodium"] = "sodium (mmol/L)"
LOOKUP_DICT["hyptenyn"] = "history of arterial hypertension"
LOOKUP_DICT["folicac"] = "folicac (µg/L)"
LOOKUP_DICT["bpsymean"] = "mean systolic blood pressure (mmHg)"
LOOKUP_DICT["adia0n"] = "oral antidiabetic agent (0-N)"
LOOKUP_DICT["totbili"] = "total bilirubin (mg/dL)"
LOOKUP_DICT["uricacid"] = "uricacid (mg/dl)"
LOOKUP_DICT["cystatc"] = "cystatin C (mg/L)"
LOOKUP_DICT["totprot"] = "total protein (g/dL)"
LOOKUP_DICT["il6"] = "interleukin 6 (ng/L)"
LOOKUP_DICT["strotime"] = "time since first stroke (days)"
LOOKUP_DICT["inrquick"] = "INR (Quick) (1)"
LOOKUP_DICT["albumin"] = "albumin (g/dL)"
LOOKUP_DICT["supercrp"] = "supersensitive C-reactive protein (mg/L)"
LOOKUP_DICT["NTproBNP_OLINK"] = "N-terminal prohormone of brain natriuretic peptide (NT-proBNP)"
LOOKUP_DICT["hklvef"] = "angiographic ejection fraction (cath report)"
LOOKUP_DICT["haptoglo"] = "haptoglobin polymorphism"
LOOKUP_DICT["ldlchol"] = "LDL-cholesterol (serum) (mg/dL)"
LOOKUP_DICT["sgpt"] = "SGPT (U/L)"
LOOKUP_DICT["vitb12"] = "vitamin B12 (ng/L)"
LOOKUP_DICT["ace0n"] = "ace-inhibitor (0-N)"
LOOKUP_DICT["tg"] = "triglycerides (serum) (mg/dL)"
LOOKUP_DICT["tnf"] = "tumor necrosis factor (TNF) (ng/L)"
LOOKUP_DICT["strokeyn"] = "stroke/PRIND/TIA"
LOOKUP_DICT["aldost"] = "aldosterone (ng/L)"
LOOKUP_DICT["parstroa"] = "number of parents having stroke at an age of less than 55 male / 60 female"
LOOKUP_DICT["vdyn"] = "peripheral vascular disease (PVD)"
LOOKUP_DICT["ech"] = "total cholesterol (EDTA) (mg/dL)"
LOOKUP_DICT["vitd25"] = "25-hydroxyvitamin D (µg/L)"

LOOKUP_DICT["ddimer"] = "D-dimer (mg/L)"
LOOKUP_DICT["platelet"] = "platelets (/nL)"
LOOKUP_DICT["crp"] = "C-reactive protein (mg/dL)"
LOOKUP_DICT["calcium"] = "calcium (mmol/L)"
LOOKUP_DICT["gluc0"] = "fasting glucose (whole blood) (mg/dL)"
LOOKUP_DICT["parstro"] = "number of parents having stroke (0-2)"
LOOKUP_DICT["po4"] = "inorganic phosphate (mg/dL)"
LOOKUP_DICT["tropt"] = "troponin T (µg/L)"
LOOKUP_DICT["crea_lcmsms1"] = "creatinine [µmol/L]"
LOOKUP_DICT["paiact"] = "PAI-1 activity (U/mL)"
LOOKUP_DICT["pulsmean"] = "mean heart rate (beats per minute)"
LOOKUP_DICT["fibrinog"] = "fibrinogen (mg/dL)"
LOOKUP_DICT["nyha"] = "NYHA heart failure classification (1-4)"
LOOKUP_DICT["galectin3"] = "galectin-3 (ng/ml)"

LOOKUP_DICT["mdrdalt"] = "eGFR MDRD Crea Jaffe"
LOOKUP_DICT["pbnpl1"] = "pro-brain natriuretic peptide (ng/ml)"
LOOKUP_DICT["etg"] = "triglycerides (EDTA) (mg/dL)"
LOOKUP_DICT["hdlchol"] = "HDL-cholesterol (serum) (mg/dL)"
LOOKUP_DICT["rhythyn"] = "arrhythmia"
LOOKUP_DICT["betayn"] = "beta blocker"
LOOKUP_DICT["cmpyn"] = "cardiomyopathy"
LOOKUP_DICT["ap"] = "alkaline phosphatase (U/L)"
LOOKUP_DICT["homocys"] = "homocysteine (µmol/L)"
LOOKUP_DICT["ecgnqmi"] = "non ST elevation (non Q) MI (cath report)"
LOOKUP_DICT["sibstro"] = "number of siblings having stroke (0-N)"
LOOKUP_DICT["il6sens"] = "IL-6 sensitive assay (ng/L)"
LOOKUP_DICT["urea"] = "urea (mg/dL)"
LOOKUP_DICT["ldh"] = "LDH (U/L)"
LOOKUP_DICT["ecgqmi"] = "ST elevation (Q wave) MI (cath report)"

LOOKUP_DICT["smoke"] = "smoking class (0=never, 1=cigarette, 2=pipe/cigar)"
LOOKUP_DICT["magnes"] = "magnesium (mmol/L)"
LOOKUP_DICT["sibstroa"] = "number of siblings having stroke at an age of less than 55 male / 60 female"
LOOKUP_DICT["hfref_hfpef"] = "type of heart failure"
LOOKUP_DICT["st2"] = "presage sST2 (U/mL)"
LOOKUP_DICT["sex"] = "sex (1=male, 2=female)"
LOOKUP_DICT["chol"] = "cholesterol (serum) (mg/dL)"
LOOKUP_DICT["renin"] = "renin (U/L)"
LOOKUP_DICT["Galectin3"] = "galectin-3 (ng/ml)"
LOOKUP_DICT["Crea_LCMSMS2"] = "creatinine (mg/dL)"
LOOKUP_DICT["hypten"] = "hypertension"
LOOKUP_DICT["CKD_EPI_GFR"] = "eGFR CKD_EPI Crea_Cys"
LOOKUP_DICT["Crea_LCMSMS1"] = "creatinine (µmol/L)"
LOOKUP_DICT["smoclass"] = "smoking class (0=no, 1=ex(>30d), 2=active)"
LOOKUP_DICT["dmwhoyn"] = "diabetic indication (WHO)"

# classical 7: diabetes, hypertension, LDL, cholesterol, HDL, smoking, age, sex

# RiskyCAD 12 features
FEATURES_12 = ['ldlch', 'hdlch', 'hba1c', 'dmwhoyn', 'smoclass', 'cystatc', 'vitd25', 'pbnpl1',
               'tropt', 'Galectin3', 'supercrp', 'st2', 'fibrinog']

# CoroPredict V1 features
FEATURES_COROV1 = ['age', 'malesex', 'ldlch', 'hdlch', 'hba1c', 'smoclass', 'dmwhoyn', 'cystatc',
                   'vitd25', 'pbnpl1', 'tropt']

# Winfried's magic 20 features
FEATURES_20 = ['hb', 'leuco', 'avfgluc', 'hba1c', 'ech', 'ldlch', 'hdlch', 'etg', 'albumin', 'sgot', 'sgpt',
               'ggt', 'crea', 'Crea_LCMSMS2', 'CKD_EPI_GFR', 'uricacid', 'potass', 'tsh', 'inrquick', 'aptt',
               'supercrp', 'haptoglo']

# Frequently used list of 21 biomarkers from the medical literature
FEATURES_21 = ['hypten', 'dm1yn', 'dm2yn', 'hfref_hfpef', 'mi012', 'strokeyn', 'strotime', 'parstro', 'parstroa',
               'sibstro', 'sibstroa', 'ecgqmi', 'ecgnqmi', 'pulsmean', 'bpsymean', 'Crea_LCMSMS1', 'hklvef',
               'ass0n', 'betayn', 'ace0n', 'adia0n', 'lilo', 'NTproBNP_OLINK']

# Handcrafted list of 60 biomarkers & comorbidities by Maciej (incl. age, sex)
FEATURES_60 = ['age', 'sex'] + list(set(LAB_MARKERS.keys()).union(set(COMORBIDITIES.keys())))

# Combined list of 90 biomarkers suggested by Samuel
FEATURES_90 = list(set(FEATURES_12 + FEATURES_20 + FEATURES_21 + FEATURES_60))


# Strict interpretation of "either died within 1 year or survived with at least 1 year follow-up data"!
def contrastive_cohort_1YM(df):
    cohort = df[(((df['death'] == 1) & (df['follmnth'] <= 12)) | ((df['death'] == 0) & (df['follmnth'] > 12)))]
    return cohort


# Strict interpretation of "either died within 10 years or survived with at least 10 year follow-up data"!
def contrastive_cohort_10YM(df):
    cohort = df[(((df['death'] == 1) & (df['follmnth'] <= 120)) | ((df['death'] == 0) & (df['follmnth'] > 120)))]
    return cohort


# Focus on sub-cohort with given CoroPredict scores!
def coropredict_cohort(df):
    cohort = df[(df['COROPREDICT_VERSION1_estimated_1_year_risk'].notna())]
    return cohort


# Focus on sub-cohort with given CoroPredict scores!
def smart_cohort(df):
    cohort = df[(df['SMART_Score_Prozent'].notna())]
    return cohort


def labels_1YM(df):
    labels = ((df['death'] == 1) & (df['follmnth'] <= 12)).astype(int)
    return labels


def labels_10YM(df):
    labels = ((df['death'] == 1) & (df['follmnth'] <= 120)).astype(int)
    return labels


# Default load function for SAV/SPSS format
def load_SAV(directory=DATA_DIRECTORY, filename="LURIC_firstobs_2025-03-08.sav", export_csv=False):
    df, _ = pyreadstat.read_sav(os.path.join(directory, filename))
    assert df['visitno'].unique().max() == 1
    df = transform_categorical(df)
    if export_csv:
        df.to_csv(os.path.join(directory, "LURIC_firstobs_2025-03-08.csv"), header=True, index=False, encoding='utf-8')
    return df


# Default load function for CSV format
def load_CSV(directory=DATA_DIRECTORY, filename="LURIC_firstobs_2025-03-08.csv"):
    df = pd.read_csv(os.path.join(directory, filename), sep=';')
    assert df['visitno'].unique().max() == 1
    return transform_categorical(df)


# Default load function for XLS format
def load_XLS(directory=DATA_DIRECTORY, filename="LURIC_firstobs_2025-03-08.xls", export_csv=False):
    df = pd.read_excel(os.path.join(directory, filename))
    assert df['visitno'].unique().max() == 1
    df = transform_categorical(df)
    if export_csv:
        df.to_csv(os.path.join(directory, "LURIC_firstobs_2025-03-08.csv"), header=True, index=False, encoding='utf-8')
    return df