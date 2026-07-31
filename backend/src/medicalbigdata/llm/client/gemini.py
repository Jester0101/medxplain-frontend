# Add all Gemini-specific settings & functions here
import os, re, numpy as np
from google import genai
#from google.genai import types
from sklearn.metrics import roc_auc_score
from tqdm import tqdm
import wandb
import asyncio
from tqdm.asyncio import tqdm as tqdm_async

def generate_seq(model_name, dataset):
    def stream(dataset):
        for patient in dataset:
            yield patient["fewshot"]

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    i = 0
    for question in tqdm(stream(dataset)):

        print("\n--- QUESTION ---------")
        print(question)
        print("----------------------\n")

        answer = client.models.generate_content(
            model=model_name,
            contents=question,
            #config=types.GenerateContentConfig(
            #    thinking_config=types.ThinkingConfig(thinking_level="low")
            #),
        ).candidates[0].content.parts[0].text

        print("\n--- ANSWER -----------")
        print(answer)
        print("----------------------\n")

        y_pred.append(float(re.search(pattern, answer).group(1)) if re.search(pattern, answer) else np.nan)
        # print(i, y_true[i], y_pred[-1], answer[:60])

        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    print("\nGENERATE GEMINI API", model_name, "FEWSHOT AUC: {0:.3f}\n".format(roc_auc_score(y_true, y_pred)))

semaphore = asyncio.Semaphore(20)

async def process_one_async(client, model_name, example):
    async with semaphore: 
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=example['fewshot'],
        )
        example['answer'] = response.candidates[0].content.parts[0].text
        return example

async def process_all_async(client, model_name, dataset, max_concurrent=20):
    tasks = [process_one_async(client, model_name, ex) for ex in dataset]
    results = []
    for task in tqdm_async.as_completed(tasks):
        result = await task
        results.append(result)

    return results


def generate_async(model_name, dataset, max_concurrent=20, wandb_tags=None):
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    pattern = r'(\d+\.?\d*)%'
    
    # Gather responses
    results = asyncio.run(process_all_async(client, model_name, dataset))

    # TODO store resuts in wandb experiments
    # Extract predictions
    answers = [r.get('answer', '') for r in results]
    prompts  = [r.get('fewshot', '') for r in results]
    y_pred = np.array([float(re.search(pattern, a).group(1))/100 if re.search(pattern, a) else np.nan for a in answers])
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)
    y_true = np.array([r['label'] for r in results])
    auc = roc_auc_score(y_true, y_pred)
    
    if wandb_tags:
        wandb.init(
            project="medical-research",
            entity="mskorski-unilu",
            config={"model":    model_name},
            tags=wandb_tags,
        )
        wandb.log({
            "auc":  auc,
            f"predictions": wandb.Table(
                                columns=["prompt", "raw_answer", "y_true", "y_pred"],
                                data=[[prompts[i], answers[i], int(y_true[i]), float(y_pred[i])] for i in range(len(y_true))]
            )
        })
        wandb.finish()
    
    print(f"\nGENERATE GEMINI-ASYNC API {model_name} FEWSHOT AUC: {auc:.3f}\n")
    
    return results

