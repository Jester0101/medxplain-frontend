from medicalbigdata.llm.prompting import get_prompts_ds
from medicalbigdata.settings.luric import load_SAV, FEATURES_90, labels_1YM
import anthropic
from tqdm import tqdm

#NOTE: Anthropic's tokenizer is available through (cost-free but rate-limited) API https://platform.claude.com/docs/en/build-with-claude/token-counting#pricing-and-rate-limits

COHORT = load_SAV(filename="LURIC_firstobs_2025-03-08.sav")
FEATURES = FEATURES_90
LABELS = labels_1YM(COHORT)

dataset = get_prompts_ds(COHORT, FEATURES, LABELS, sys_msg='generate')

SYSTEM_MESSAGE = """You are a medical expert analyzing patient data for mortality risk assessment.
Based on the provided patient information, estimate the 1-year mortality risk of the patient as a percentage (0-100%).
Consider all relevant clinical factors including age, sex, comorbidities, vital signs, laboratory values, and functional status.
"""

client = anthropic.Anthropic()

total_tokens = sum(
    client.messages.count_tokens(
        model='claude-sonnet-4-5',
        system=SYSTEM_MESSAGE,
        messages=[{"role": "user", "content": ex['fewshot']}]
    ).input_tokens
    for ex in tqdm(dataset)
)

