from medicalbigdata.settings.luric import *

# Define one-shot template (keep the line breaks!)
ONESHOT_PROMPT_TEMPLATE = """{system_message}{patient_data}"""


# Maciej's prompt (works for FEATURES_60)
def get_patient_LURIC(patient_data):
    """Create patient prompt with key mortality biomarkers in the form of clinical notes."""
    age = int(patient_data['age']) if pd.notna(patient_data['age']) else None
    sex = 'male' if patient_data['sex'] == 1 else 'female' if patient_data['sex'] == 2 else None
    prompt = f"The patient is a {age}-year old {sex} who underwent coronary angiography"

    lab_details = []
    for marker, (name, unit, decimals) in LAB_MARKERS.items():
        if pd.notna(patient_data.get(marker)):
            val = patient_data[marker]
            lab_details.append(f"{name} level of {val:.{decimals}f}" + ((" " + unit) if unit else ""))
    if lab_details:
        prompt += ", presenting with " + "; ".join(lab_details)

    history_details = []
    for comborbidity, name in COMORBIDITIES.items():
        if patient_data.get(comborbidity) == 1:
            history_details.append(name)
    if history_details:
        prompt += ", having a history of " + "; ".join(history_details) + "."
    else:
        prompt += "."

    return prompt


# Samuel's generic prompt (works for all FEATURES_*)
def get_patient_LURIC2(patient_data, features):
    age = int(patient_data['age']) if pd.notna(patient_data['age']) else None
    sex = 'male' if patient_data['sex'] == 1 else 'female' if patient_data['sex'] == 2 else None
    prompt = f"The patient is a {age}-year old {sex} who underwent coronary angiography, presenting with"

    has_features = False
    for feature in features:
        val = patient_data[feature]
        if not feature in ['age', 'sex'] and pd.notna(val) and val > 0:
            if feature.endswith('yn'):  # TODO: more carefully encode categorical features!
                prompt += " " + LOOKUP_DICT[feature] + ";"
            else:
                if val.is_integer():
                    prompt += " " + LOOKUP_DICT[feature] + " value of " + str(int(val)) + ";"
                else:
                    prompt += " " + LOOKUP_DICT[feature] + " level of " + str(round(val, 2)) + ";"
            has_features = True

    prompt = prompt[0:len(prompt) - (1 if has_features else 17)] + "."  # bit of a hack ;-)

    return prompt
