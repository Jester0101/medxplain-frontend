import pandas as pd
from tableone import TableOne


def extract_cat_features(X, min_vals=2, max_vals=16):
    df = X.copy(deep=True)
    cat_features = []
    for i, col in enumerate(df.select_dtypes(include=["category"]).columns.tolist()):
        if not 'date' in col and not 'time' in col and min_vals <= df[col].nunique() <= max_vals:
            cat_features.append(col)
        else:
            df = df.drop(col, axis=1)
    return df, cat_features


def transform_one_hot(X, min_vals=2, max_vals=16):
    df = X.copy(deep=True)
    for i, col in enumerate(df.select_dtypes(include=["category"]).columns.tolist()):
        if not 'date' in col and not 'time' in col and min_vals <= df[col].nunique() <= max_vals:
            one_hot = pd.get_dummies(df[col], dtype=int)
            cols = []
            for j, c in enumerate(one_hot.columns):
                cols.append(col + '+' + str(j))
            one_hot = one_hot.set_axis(cols, axis=1)
            df = df.drop(col, axis=1)
            df = pd.concat([df, one_hot], axis=1)
    df = df.select_dtypes(include=['number'])
    return df, []


def get_significant_features(X, cat_features=[], p_thresh=0.01):
    table1 = TableOne(
        X,
        columns=list(X.columns.tolist()),
        categorical=cat_features,
        groupby='label',
        pval=True
    )

    # Get p-values and sort
    pvals = table1.tableone.xs('P-Value', axis=1, level=1).iloc[:, 0]
    pvals = pd.to_numeric(pvals.astype(str).str.replace('<', ''), errors='coerce')
    pvals_sorted = pvals.dropna().sort_values()
    pvals_sorted.index = pvals_sorted.index.get_level_values(0)
    pvals_sorted.index = pvals_sorted.index.str.split(',').str[0].str.replace('<', '').str.strip()

    # Remove rows containing 'label', 'death' & 'follmn' (in LURIC)
    pvals_sorted = pvals_sorted[~pvals_sorted.index.str.contains('label', case=False, na=False)]
    pvals_sorted = pvals_sorted[~pvals_sorted.index.str.contains('death', case=False, na=False)]
    pvals_sorted = pvals_sorted[~pvals_sorted.index.str.contains('follmn', case=False, na=False)]

    # Select significant features
    significant_features = pvals_sorted[pvals_sorted < p_thresh].index.tolist()
    print(f"Significant features (p<{p_thresh}): {len(significant_features)}")
    print(table1.tableone)
    return significant_features


def get_lowcorr_features(X, features, target='label', c_thresh=0.5):
    corr = pd.DataFrame(X[features + [target]].corr(numeric_only=True)[target].sort_values(ascending=False))
    lowcorr_features = list(corr[(abs(corr[target]) < c_thresh)].index)
    print(f"Low-corr features (c<{c_thresh}): {len(lowcorr_features)}")
    print(corr)
    return lowcorr_features