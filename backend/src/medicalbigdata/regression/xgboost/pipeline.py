from sklearn.calibration import CalibratedClassifierCV
# from sklearn.impute import SimpleImputer
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
# from sklearn.preprocessing import StandardScaler, QuantileTransformer

from xgboost import XGBClassifier


def run(X, y, n_splits=5, **params):
    # Build pipeline with default or given params
    if not params:
        params = {"n_estimators": 1000, "max_depth": 7, "eta": 0.1, "subsample": 0.7, "colsample_bytree": 0.8,
                  'eval_metric': 'aft-nloglik', 'verbosity': 0}

    pipeline = Pipeline([
        # ('imputer', SimpleImputer(strategy="median")),  # not needed!
        # ('scaler', StandardScaler()),  # not needed!
        # ('quantile', QuantileTransformer(output_distribution='normal', random_state=42)),  # not needed!
        # ('xgboost', XGBClassifier(**params)),
        ('calibrated_xgboost', CalibratedClassifierCV(XGBClassifier(**params))),
    ])

    print("PIPELINE:", [p[0] for p in pipeline.steps], "PARAMS:", params)

    # Stratified CV
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X.values, y, cv=cv, scoring='roc_auc')
    print(f"XGBOOST {n_splits}-FOLD CV AVG AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})\n")

    return cv_scores, pipeline
