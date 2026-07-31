import gc, re, numpy as np
from sklearn.metrics import roc_auc_score
from tqdm import tqdm

from medicalbigdata.llm.client.llama import *
from transformers import pipeline


def generate_tf_batch(model_name, dataset, load_in_4bit=False, batch_size=32):
    generator = pipeline(
        task="text-generation",
        model=model_name,
        model_kwargs={"quantization_config": quantization_config, "low_cpu_mem_usage": True} if load_in_4bit else None,
        batch_size=batch_size,  # 32 yields about 30 it/sec on 8B models
        truncation=True,
        device_map="auto")

    generator.tokenizer.pad_token = generator.tokenizer.eos_token
    generator.tokenizer.padding_side = 'left'  # needed for batching!

    def stream(dataset):
        for patient in dataset:
            yield patient["fewshot"]

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    i = 0
    for answer in tqdm(generator(stream(dataset), max_new_tokens=12, pad_token_id=generator.tokenizer.eos_token_id,
                                 batch_size=batch_size)):
        answer = answer[0]['generated_text'].replace(dataset[i]['fewshot'], "")
        y_pred.append(float(re.search(pattern, answer).group(1)) if re.search(pattern, answer) else np.nan)
        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    auc = roc_auc_score(y_true, y_pred)
    print("\nGENERATE TF BATCH", model_name, "FEWSHOT AUC: {0:.3f}\n".format(auc))

    del generator
    gc.collect()

    return auc
