# Add all Claude-specific settings & functions here

import os, re, numpy as np
from sklearn.metrics import roc_auc_score
from tqdm import tqdm
from anthropic import Anthropic, AsyncAnthropic
import asyncio
from tqdm.asyncio import tqdm as tqdm_async
import wandb


def generate(model_name, dataset):
    def stream(dataset):
        for patient in dataset:
            yield patient["fewshot"]

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    client = Anthropic(api_key=os.environ["CLAUDE_API_KEY"])



    i = 0
    for question in tqdm(stream(dataset)):

        print("\n--- QUESTION ---------")
        print(question)
        print("----------------------\n")

        answer = client.messages.create(
            model=model_name,
            max_tokens=500,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": question
                }
            ]
        ).content[0].text

        print("\n--- ANSWER -----------")
        print(answer)
        print("----------------------\n")

        y_pred.append(float(re.search(pattern, answer).group(1)) if re.search(pattern, answer) else np.nan)
        # print(i, y_true[i], y_pred[-1], answer[:60])

        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    #Saving ROC values to file for reuse
    import json

    y_pred = [float(x) for x in y_pred]
    y_true = [float(x) for x in y_true]

    y_pred = list(y_pred)
    y_true = list(y_true)

    

    data = {
        "y_true": y_true,
        "y_pred": y_pred
        
    }

    with open("Claude_ROC_Values.json", "w") as f:
        json.dump(data, f)

    print("\nGENERATE CLAUDE API", model_name, "FEWSHOT AUC: {0:.3f}\n".format(roc_auc_score(y_true, y_pred)))
    
    
# Async version
semaphore = asyncio.Semaphore(20)

async def process_one_async(client, model_name, example):
    async with semaphore:
        response = await client.messages.create(
            model=model_name,
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": example['fewshot']}]
        )
        example['answer'] = response.content[0].text
        return example

async def process_all_async(client, model_name, dataset):
    tasks = [process_one_async(client, model_name, ex) for ex in dataset]
    results = []
    for task in tqdm_async.as_completed(tasks):
        result = await task
        results.append(result)
    return results

def generate_async(model_name, dataset, max_concurrent=20, wandb_tags=None):
    client = AsyncAnthropic()
    
    results = asyncio.run(process_all_async(client, model_name, dataset))

    answers = [r.get('answer', '') for r in results]
    prompts = [r.get('fewshot', '') for r in results]
    
    pattern = r'(\d+\.?\d*)%'
    y_pred = np.array([float(re.search(pattern, a).group(1))/100 if re.search(pattern, a) else np.nan for a in answers])
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)
    y_true = np.array([r['label'] for r in results])
    auc = roc_auc_score(y_true, y_pred)
    
    if wandb_tags:
        wandb.init(
            project="medical-research",
            entity="mskorski-unilu",
            config={"model": model_name},
            tags=wandb_tags,
        )
        wandb.log({
            "auc": auc,
            "predictions": wandb.Table(
                columns=["prompt", "raw_answer", "y_true", "y_pred"],
                data=[[prompts[i], answers[i], int(y_true[i]), float(y_pred[i])] for i in range(len(y_true))]
            )
        })
        wandb.finish()
    
    print(f"\nGENERATE CLAUDE-ASYNC API {model_name} FEWSHOT AUC: {auc:.3f}\n")
    
    return results