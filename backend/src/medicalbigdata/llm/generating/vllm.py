import re, numpy as np
from sklearn.metrics import roc_auc_score
from tqdm import tqdm
from vllm import LLM, SamplingParams
import wandb

TENSOR_PARALLEL_SIZE = 2
MAX_MODEL_LEN = 4096
MAX_NUM_SEQS = 32
TEMPERATURE = 0.3
MAX_TOKENS = 12


def generate_vllm_seq_old(model_name, dataset, load_in_4bit=False):
    llm = LLM(
        model=model_name,
        quantization="bitsandbytes" if load_in_4bit else None,
        tensor_parallel_size=TENSOR_PARALLEL_SIZE,
        dtype="bfloat16",
        trust_remote_code=True,
        max_model_len=MAX_MODEL_LEN,
        max_num_seqs=MAX_NUM_SEQS,
    )

    sampling_params = SamplingParams(temperature=TEMPERATURE, max_tokens=MAX_TOKENS, detokenize=True)

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    i = 0
    for patient in tqdm(dataset):
        output = llm.generate([patient['fewshot']], sampling_params)[0]
        y_pred.append(float(re.search(pattern, output.outputs[0].text).group(1)) if re.search(pattern, output.outputs[
            0].text) else np.nan)
        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    auc = roc_auc_score(y_true, y_pred)
    print("\nGENERATE vLLM SEQ", model_name, "FEWSHOT AUC: {0:.3f}\n".format(auc))

    return auc


def generate_vllm_batch(model_name, dataset, prompt_type="fewshot", load_in_4bit=False, wandb_tags=None):
    
    wb_run = None
    if wandb_tags:
        wb_run = wandb.init(
            project="medical-research", entity="mskorski-unilu",
            config={"model_name": model_name, "prompt_type": prompt_type, "load_in_4bit": load_in_4bit, "temperature": TEMPERATURE},
            tags=wandb_tags,
        )
    
    llm = LLM(
        model=model_name,
        quantization="bitsandbytes" if load_in_4bit else None,
        tensor_parallel_size=TENSOR_PARALLEL_SIZE,
        dtype="bfloat16",
        trust_remote_code=True,
        max_model_len=MAX_MODEL_LEN,
        max_num_seqs=MAX_NUM_SEQS,
    )

    sampling_params = SamplingParams(temperature=TEMPERATURE, max_tokens=MAX_TOKENS,)

    def parse(text):
        m = re.search(r'(\d+\.?\d*)%', text)
        return float(m.group(1)) / 100 if m else np.nan

    # inference automatically batched
    prompts = [p[prompt_type] for p in dataset]
    outputs = llm.generate(prompts, sampling_params)
    answers = [o.outputs[0].text for o in outputs]

    y_true = np.array(dataset['label'])
    y_pred = np.array([parse(a) for a in answers])

    # parse rate
    mask = ~np.isnan(y_pred)
    print(f"Parse rate: {mask.mean():.3f} ({mask.sum()}/{len(mask)})")

    y_pred[~mask] = np.nanmean(y_pred)
    auc = roc_auc_score(y_true, y_pred)
    print(f"AUC ({prompt_type}) [{model_name}]: {auc:.3f}")
    
    # log to W&B
    if wb_run:
        wb_run.log({
            "roc_auc_score": auc,
            "parse_rate": mask.mean(),
            "n_total": len(mask),
            "predictions": wandb.Table(
                columns=["prompt", "answer", "y_true", "y_pred"],
                data=[[p, a, int(yt), float(yp)] for p, a, yt, yp in zip(prompts, answers, y_true, y_pred)]
            )
        })
        wb_run.finish()

    return auc


def generate_vllm_batch_old(model_name, dataset, load_in_4bit=False, batch_size=5000):
    llm = LLM(
        model=model_name,
        quantization="bitsandbytes" if load_in_4bit else None,
        tensor_parallel_size=TENSOR_PARALLEL_SIZE,
        dtype="bfloat16",
        trust_remote_code=True,
        max_model_len=MAX_MODEL_LEN,
        max_num_seqs=MAX_NUM_SEQS,
    )

    sampling_params = SamplingParams(temperature=TEMPERATURE, max_tokens=MAX_TOKENS, detokenize=True)

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    i = 0
    b = 0
    while b * batch_size < len(dataset):

        batch = range(b * batch_size, min((b + 1) * batch_size, len(dataset)))
        prompts = [patient['fewshot'] for patient in dataset.select(batch)]
        outputs = llm.generate(prompts, sampling_params)
        for output in outputs:
            y_pred.append(float(re.search(pattern, output.outputs[0].text).group(1)) if re.search(pattern,
                                                                                                  output.outputs[
                                                                                                      0].text) else np.nan)
            i += 1
        b += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    auc = roc_auc_score(y_true, y_pred)
    print("\nGENERATE vLLM BATCH", model_name, "FEWSHOT AUC: {0:.3f}\n".format(auc))

    return auc
