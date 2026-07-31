import re

import numpy as np
from sklearn.metrics import roc_auc_score
from tqdm import tqdm

from unsloth import FastLanguageModel
from vllm import SamplingParams, TokensPrompt


def generate_unsloth_seq(model_name, dataset, load_in_4bit=True):
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=4096,
        load_in_4bit=load_in_4bit,
        fast_inference=True,
        dtype=None,
    )

    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.add_special_tokens({'pad_token': tokenizer.eos_token})

    FastLanguageModel.for_inference(model)  # "Enable native 2x faster inference"
    model.config.pad_token_id = tokenizer.pad_token_id

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    i = 0
    for patient in tqdm(dataset):
        inputs = tokenizer(
            [
                patient['fewshot']
            ],
            return_tensors="pt",
        ).to("cuda")

        answer = tokenizer.decode(model.generate(**inputs, temperature=0.1, max_new_tokens=12)[0],
                                  skip_special_tokens=True).replace(dataset[i]['fewshot'], "")
        y_pred.append(float(re.search(pattern, answer).group(1)) if re.search(pattern, answer) else np.nan)
        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    auc = roc_auc_score(y_true, y_pred)
    print("\nGENERATE UNSLOTH SEQ", model_name, "FEWSHOT AUC: {0:.3f}\n".format(auc))

    return auc


def generate_unsloth_batch(model_name, dataset, load_in_4bit=True, batch_size=5000):
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=4096,
        load_in_4bit=load_in_4bit,
        fast_inference=True,
        dtype=None,
    )

    # FIXME Unsloth still complains about missing PAD token although generating then works fine!
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.add_special_tokens({'pad_token': tokenizer.eos_token})
    tokenizer.padding_side = 'left'  # needed for batching!

    FastLanguageModel.for_inference(model)  # "Enable native 2x faster inference"
    model.config.pad_token_id = tokenizer.pad_token_id

    sampling_params = SamplingParams(
        temperature=0.1,
        max_tokens=12,
        detokenize=True
    )

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    i = 0
    b = 0
    while b * batch_size < len(dataset):

        batch = range(b * batch_size, min((b + 1) * batch_size, len(dataset)))

        inputs = tokenizer(
            [patient['fewshot'] for patient in dataset.select(batch)],
            return_tensors="pt",
            padding=True,
            padding_side="left")

        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        list_of_token_prompts = [
            TokensPrompt(prompt_token_ids=single_padded_prompt_tensor.tolist())
            for single_padded_prompt_tensor in inputs["input_ids"]
        ]

        vllm_outputs = model.fast_generate(list_of_token_prompts, sampling_params=sampling_params)
        batch_outputs = [vllm_outputs[i].outputs[0].text for i in range(len(vllm_outputs))]

        for output in batch_outputs:
            y_pred.append(float(re.search(pattern, output).group(1)) if re.search(pattern, output) else np.nan)
            i += 1
        b += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    auc = roc_auc_score(y_true, y_pred)
    print("\nGENERATE UNSLOTH BATCH", model_name, "FEWSHOT AUC: {0:.3f}\n".format(auc))

    return auc
