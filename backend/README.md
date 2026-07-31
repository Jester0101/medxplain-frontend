# MedicalBigData

## Summary

Group Repository for Medical Big Data Research

## Instructions

Use the run script with `finetune_tf` or `finetune_ds` to fine-tune HuggingFace models.

For options, run from the top directory:
```bash
python ./src/run.py --help
```
Examples:
```bash
# Default: Med42-8B, full cohort, no quantization (16bit), 60 features, Transformers
python ./src/run.py --task finetune_tf
# Quantization (4bit)
python ./src/run.py --task finetune_tf --load_in_4bit
# Other features (RiskyCAD, incl. age & sex)
python ./src/run.py --task finetune_tf --features LURIC_12
# Custom model
python ./src/run.py --task finetune_tf --model aaditya/Llama3-OpenBioLLM-8B
# Choose cohort
python ./src/run.py --task finetune_tf --cohort coropredict
# Subsample dataset
python ./src/run.py --task finetune_tf --subsample 50 50
# Select evaluation metric
python ./src/run.py --task finetune_tf --eval_strat TRIPLE_EARLY
# DeepSpeed multi-GPU
deepspeed --include="localhost:0,1" ./src/run.py --task finetune_ds
# Single GPU via Transformers
CUDA_VISIBLE_DEVICES=0 python ./src/run.py --task finetune_tf
# Tag experiment in W&B
python ./src/run.py --wandb_tag "experiment-1"
# Run Gemini 
python ./src/run.py --cohort full --task generate_gemini_async --subsample 20 20 --model gemini-3.5-flash --wandb_tags gemini
```
Use scripts to evaluate over a grid of parameters:
```bash
for feature in LURIC_60 LURIC_12 LURIC_20 LURIC_21 LURIC_90; do
    for model in google/gemma-4-26B-A4B; do
        echo "Running: FEATURE_SET=$feature | model=$model"
        python ./src/run.py --cohort full --task generate_vllm_batch --features $feature --model $model --wandb_tags "Gemma 4" $feature full
        echo "Done: FEATURE_SET=$feature | model=$model"
        echo "---"
    done
done
```