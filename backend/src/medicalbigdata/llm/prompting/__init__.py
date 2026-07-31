from medicalbigdata.llm.prompting.fewshot import *
from medicalbigdata.llm.prompting.oneshot import *

# General system message (keep the line breaks!)
SYSTEM_MESSAGE = """You are a medical expert analyzing patient data for mortality risk assessment.
Based on the provided patient information, estimate the 1-year mortality risk of the patient as a percentage (0-100%).
Consider all relevant clinical factors including age, sex, comorbidities, vital signs, laboratory values, and functional status.

"""


def get_prompts_ds(cohort, features, labels, sys_msg=True):
    if features == FEATURES_60:
        patients = cohort.apply(lambda patient: get_patient_LURIC(patient), axis=1) # best prompt for Maciej's features!
    else:
        patients = cohort.apply(lambda patient: get_patient_LURIC2(patient, features), axis=1) # generic prompt!
    oneshot_prompts = patients.apply(
        lambda patient: ONESHOT_PROMPT_TEMPLATE.format(system_message=SYSTEM_MESSAGE if sys_msg else "",
                                                       patient_data=patient))
    fewshot_prompts = patients.apply(
        lambda patient: FEWSHOT_PROMPT_TEMPLATE.format(system_message=SYSTEM_MESSAGE if sys_msg else "",
                                                       patient_data=patient))
    return Dataset.from_dict({'oneshot': oneshot_prompts, 'fewshot': fewshot_prompts, 'label': labels})
