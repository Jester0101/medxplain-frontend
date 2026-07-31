# Run as: nohup python -u ./src/runall_generation_LURIC.py > ./docs/runall_generation_LURIC.txt &

import itertools, os
from datetime import datetime

COHORTS = ['full', 'coropredict']
MODELS = ['google/medgemma-27b-text-it', 'm42-health/Llama3-Med42-70B',
          'Henrychur/MMed-Llama3.1-70B', 'johnsnowlabs/JSL-MedLlama-3-8B-v2.0', 'epfl-llm/meditron-70b',
          'aaditya/Llama3-OpenBioLLM-70B', 'meta-llama/Llama-3.1-70B']
FEATURES = ['LURIC_12', 'LURIC_20', 'LURIC_21', 'LURIC_60', 'LURIC_90']

print("EXECUTIONS STARTED:", datetime.now())
for cohort, model, features in itertools.product(COHORTS, MODELS, FEATURES):
    os.system(
        f"python ./src/run.py --task generate_vllm_batch --cohort {cohort} --model {model} --features {features}")
print("EXECUTIONS ENDED:", datetime.now())
