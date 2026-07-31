from catboost import CatBoostClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
# from sklearn.preprocessing import StandardScaler, QuantileTransformer


def run(X, y, n_splits=5, cat_features=None, **params):
    # Build pipeline with default or given params
    if not params:
        params = {"iterations": 1000, "learning_rate": 0.002, "depth": 5,
                  "l2_leaf_reg": 6}  # NOTE: using strong regularizaton!

    pipeline = Pipeline([
        # ('imputer', SimpleImputer(strategy="median")),  # not needed!
        # ('scaler', StandardScaler()), # not needed!
        # ('quantile_transformer', QuantileTransformer(output_distribution='normal', random_state=42)), # not needed!
        # ('catboost',
        # CatBoostClassifier(cat_features=cat_features, one_hot_max_size=16, allow_writing_files=False, verbose=False, eval_metric="AUC", **params)),
        ('calibrated_catboost',
         CalibratedClassifierCV(
             CatBoostClassifier(cat_features=cat_features, one_hot_max_size=16, allow_writing_files=False,
                                verbose=False, eval_metric="AUC",
                                **params)))
    ])

    print("PIPELINE:", [p[0] for p in pipeline.steps], "PARAMS:", params)

    # Stratified k-fold cross-validation
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring='roc_auc', n_jobs=10)
    print(f"CATBOOST {n_splits}-FOLD CV AVG AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})\n")

    return cv_scores, pipeline
