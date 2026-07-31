from pytabkit import RealMLP_TD_Classifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
# from sklearn.preprocessing import StandardScaler, QuantileTransformer

import torch


def run(X, y, n_splits=5, **params):
    # Build pipeline with default or given params
    if not params:
        params = {"random_state": 42, "n_cv": 1, "n_refit": 0, "n_epochs": 256, "batch_size": 256,
                  "hidden_sizes": [256] * 3, "val_metric_name": "cross_entropy", "use_ls": False,
                  "lr": 0.04, "verbosity": 0}
    else:
        params["hidden_sizes"] = [params["hidden_sizes_l"]] * params["hidden_sizes_k"]
        del params["hidden_sizes_l"]
        del params["hidden_sizes_k"]

    pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy="median")),
        # ('scaler', StandardScaler()),  # not needed!
        # ('quantile', QuantileTransformer(output_distribution='normal', random_state=42)),  # not needed!
        # ('realmlp', RealMLP_TD_Classifier(device='cpu', **params)),
        ('calibrated_realmlp', CalibratedClassifierCV(
            RealMLP_TD_Classifier(device='cuda:0' if torch.cuda.is_available() else 'cpu', **params))), # 0.826 n_cv=3 LURIC_12!
        # ('pytab_ensemble', Ensemble_TD_Classifier(device='cpu'))
        # ('calibrated_pytab_ensemble', CalibratedClassifierCV(Ensemble_TD_Classifier(device='cpu'))), # 0.812 n_cv=1 LURIC_12!
    ])

    print("PIPELINE:", [p[0] for p in pipeline.steps], "PARAMS:", params)

    # Stratified CV
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X.values, y, cv=cv, scoring='roc_auc')
    print(f"REALMLP {n_splits}-FOLD CV AVG AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})\n")

    return cv_scores, pipeline
