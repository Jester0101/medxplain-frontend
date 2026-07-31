# Default settings such as working directories & warning levels
import os

# os.environ["CUDA_VISIBLE_DEVICES"] = "0,1" # NOTE: mask GPUs if needed
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

try:
    local_rank = int(os.environ['LOCAL_RANK'])
except KeyError:
    local_rank = -1

try:
    # Original repo layout: checked out as a folder literally named "MedicalBigData".
    WORK_DIRECTORY = os.getcwd()[0:os.getcwd().index("MedicalBigData") + 14]
except ValueError:
    # Fallback for layouts where this repo is nested under another project
    # (e.g. as `backend/` inside medxplain-frontend) -- resolve relative to
    # this file's own location instead of assuming a folder name/cwd.
    WORK_DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATA_DIRECTORY = os.path.join(WORK_DIRECTORY, "data")

if local_rank < 1:
    print("DATA_DIRECTORY:", DATA_DIRECTORY)

import warnings

warnings.filterwarnings(action="ignore")  # ignore all
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)

warnings.filterwarnings("ignore", message=".*ignore_implicit_zeros.*")
warnings.filterwarnings("ignore", message=".*n_quantiles.*")

import pandas as pd

pd.options.display.max_columns = 250
pd.options.display.max_rows = 100

import numpy as np

np.set_printoptions(formatter={'float_kind': "{:.3f}".format})

from datasets import Dataset


# Get a subset of a Dataset with pos/neg labels, order is preserved
def get_sample_ds(dataset, pos=10, neg=10):
    d_pos = []
    d_neg = []
    for d in dataset:
        if d['label'] == 1:
            d_pos.append(d)
        else:
            d_neg.append(d)
    return Dataset.from_list(d_pos[:pos] + d_neg[:neg])


# Get a subset of a Dataframe with pos/neg labels, order is preserved
def get_sample_df(df, labels, pos=10, neg=10):
    return pd.concat([df.loc[labels[labels == 0].index[:neg]], df.loc[labels[labels == 1].index[:pos]]],
                     ignore_index=True), pd.Series([0] * neg + [1] * pos)


# Transform the default Pandas 'object' type to 'category' (and then optionally to numeric values)
def transform_categorical(df, to_numeric=False):
    for col in df.select_dtypes(['object']).columns:
        df[col] = df[col].astype('category')
    if to_numeric:
        df[df.select_dtypes(['category']).columns] = df[df.select_dtypes(['category']).columns].apply(
            lambda x: x.cat.codes)
    return df
