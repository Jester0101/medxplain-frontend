# Run as: nohup python -u ./src/runall_finetuning_LURIC.py > ./docs/runall_finetuning_LURIC.txt &

import itertools, os
from datetime import datetime

COHORTS = ['full', 'coropredict']
MODELS = ['google/medgemma-4b-it', 'm42-health/Llama3-Med42-8B', 'Henrychur/MMed-Llama-3-8B',
          'johnsnowlabs/JSL-MedLlama-3-8B-v2.0', 'OpenMeditron/Meditron3-8B', 'aaditya/Llama3-OpenBioLLM-8B',
          'meta-llama/Llama-3.1-8B']
FEATURES = ['LURIC_12', 'LURIC_20', 'LURIC_21', 'LURIC_60', 'LURIC_90']

print("EXECUTIONS STARTED:", datetime.now())
for cohort, model, features in itertools.product(COHORTS, MODELS, FEATURES):
    os.system(
        f"deepspeed --include=\"localhost:0,1\" ./src/run.py --task finetune_ds --cohort {cohort} --model {model} --features {features} --n_epochs 5 --eval_strat LAST")
print("EXECUTIONS ENDED:", datetime.now())
