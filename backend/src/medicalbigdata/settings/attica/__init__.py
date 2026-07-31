# Put all ATTICA-specific features here

import pyreadstat

from medicalbigdata.settings import *

# RiskyCAD 12 features (approximate/incomplete for ATTICA!)
FEATURES_12 = ['LDL', 'HDL', 'DM', 'Smoking', 'smoking_ever', 'Hcy', 'CRP', 'Fibrinogen']


def labels_1YM(df):
    labels = ((df['Death20'] == 1) & (df['FU20'] <= 1)).astype(int)
    return labels


def labels_10YM(df):
    labels = ((df['Death20'] == 1) & (df['FU20'] <= 10)).astype(int)
    return labels


def labels_20YM(df):
    labels = (df['Death20'] == 1).astype(int)
    return labels


def contrastive_cohort_1YM(df):
    cohort = df[
        (((df['Death20'] == 1) & (df['FU20'] <= 1)) | ((df['Death20'] == 0) & (df['FU20'] > 1)))]
    return cohort


def contrastive_cohort_10YM(df):
    cohort = df[
        (((df['Death20'] == 1) & (df['FU20'] <= 10)) | ((df['Death20'] == 0) & (df['FU20'] > 10)))]
    return cohort


def contrastive_cohort_20YM(df):  # this is all the rest for ATTICA!
    return df


# Default load function for SAV/SPSS format
def load_SAV(directory=DATA_DIRECTORY, filename="ATTICA_Study_20_yr_FU_Data_Analysis_Shared.sav", export_csv=True):
    df, _ = pyreadstat.read_sav(os.path.join(directory, filename))
    df.dropna(subset=['Death20', 'CVDDeath20', 'FU20'], inplace=True)
    df['Death20'] = (df['Death20'] == "Απεβίωσαν").astype(int)
    df['CVDDeath20'] = (df['CVDDeath20'] == "Yes").astype(int)
    df = transform_categorical(df)
    if export_csv:
        df.to_csv(os.path.join(directory, "ATTICA_Study_20_yr_FU_Data_Analysis_Shared.csv"), header=True, index=False,
                  encoding='utf-8')
    return df


# Default load function for CSV format
def load_CSV(directory=DATA_DIRECTORY, filename="ATTICA_Study_20_yr_FU_Data_Analysis_Shared.csv"):
    df = pd.read_csv(os.path.join(directory, filename), sep=',')
    df.dropna(subset=['Death20', 'CVDDeath20', 'FU20'], inplace=True)
    df['Death20'] = (df['Death20'] == "Απεβίωσαν").astype(int)
    df['CVDDeath20'] = (df['CVDDeath20'] == "Yes").astype(int)
    return transform_categorical(df)


# Default load function for XLS format
def load_XLS(directory=DATA_DIRECTORY, filename="ATTICA_Study_20_yr_FU_Data_Analysis_Shared.xls", export_csv=False):
    df = pd.read_excel(os.path.join(directory, filename))
    df.dropna(subset=['Death20', 'CVDDeath20', 'FU20'], inplace=True)
    df['Death20'] = (df['Death20'] == "Απεβίωσαν").astype(int)
    df['CVDDeath20'] = (df['CVDDeath20'] == "Yes").astype(int)
    df = transform_categorical(df)
    if export_csv:
        df.to_csv(os.path.join(directory, "ATTICA_Study_20_yr_FU_Data_Analysis_Shared.csv"), header=True, index=False,
                  encoding='utf-8')
    return df


# Transform the default Pandas 'object' type to 'category' (and then optionally to numeric values)
def transform_categorical(df, to_numeric=False):
    for col in df.select_dtypes(['object']).columns:
        df[col] = df[col].astype('category')
    if to_numeric:
        df[df.select_dtypes(['category']).columns] = df[df.select_dtypes(['category']).columns].apply(
            lambda x: x.cat.codes)
    return df
