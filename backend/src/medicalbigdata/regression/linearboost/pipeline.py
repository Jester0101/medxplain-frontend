from linearboost.linear_boost import LinearBoostClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
# from sklearn.preprocessing import StandardScaler, QuantileTransformer


def run(X, y, n_splits=5, **params):
    # Build pipeline with default or given params
    if not params:
        params = {"n_estimators": 100, "learning_rate": 0.002, "algorithm": "SAMME", "scaler": "minmax",
                  "kernel": "linear"}

    pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy="median")),  # need to avoid NaNs!
        # ('scaler', StandardScaler()), # not needed!
        # ('quantile', QuantileTransformer(output_distribution='normal', random_state=42)), # not needed!
        # ('linearboost', LinearBoostClassifier(**params)),
        ('calibrated_linearboost',
         CalibratedClassifierCV(LinearBoostClassifier(**params)))  # calibration actually helps for LinearBoost!
    ])

    print("PIPELINE:", [p[0] for p in pipeline.steps], "PARAMS:", params)

    # Stratified k-fold cross-validation
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring='roc_auc', n_jobs=10)
    print(f"LINEARBOOST {n_splits}-FOLD CV AVG AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})\n")

    return cv_scores, pipeline
