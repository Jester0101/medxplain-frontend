# Add all ChatGPT-specific settings & functions  here
import re, numpy as np
from openai import OpenAI
from sklearn.metrics import roc_auc_score
from tqdm import tqdm


def generate(model_name, dataset):
    def stream(dataset):
        for patient in dataset:
            yield patient["fewshot"]

    pattern = r'(\d+\.?\d*)%'
    y_true = dataset['label']
    y_pred = []

    client = OpenAI()

    i = 0
    for question in tqdm(stream(dataset)):
        answer = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": question}
            ]
        ).choices[0].message.content

        print("\n----------------------")
        print(answer)
        print("----------------------\n")

        y_pred.append(float(re.search(pattern, answer).group(1)) if re.search(pattern, answer) else np.nan)
        # print(i, y_true[i], y_pred[-1], answer[:60])

        i += 1

    y_pred = np.array(y_pred) / 100
    y_pred[np.isnan(y_pred)] = np.nanmean(y_pred)

    print("\nGENERATE OPENAI API", model_name, "FEWSHOT AUC: {0:.3f}\n".format(roc_auc_score(y_true, y_pred)))
