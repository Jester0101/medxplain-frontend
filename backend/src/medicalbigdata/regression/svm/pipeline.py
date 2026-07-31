import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler  # , QuantileTransformer
from sklearn.svm import LinearSVC


def run(X, y, n_splits=5, **params):
    # Build pipeline with default or given params
    if not params:
        params = {"C": 1e1, "dual": "auto", "random_state": 42}

    # Custom transformer for correlation-based feature selection
    class CorrelationSelector(BaseEstimator, TransformerMixin):
        def __init__(self, min_corr=0.05, max_corr=0.95):
            self.min_corr = min_corr
            self.max_corr = max_corr
            self.selected_features_ = None

        def fit(self, X, y):
            correlations = np.abs(np.corrcoef(X.T, y)[-1, :-1])  # vectorized correlation
            self.selected_features_ = np.where((correlations > self.min_corr) & (correlations < self.max_corr))[0]
            return self

        def transform(self, X):
            return X[:, self.selected_features_]

    # Pipeline with optional feature selection
    pipeline = Pipeline([
        ('feature_selection', CorrelationSelector(min_corr=0.1, max_corr=0.9)),
        ('imputer', SimpleImputer(strategy="median")),  # need to avoid NaNs!
        ('scaler', StandardScaler()),
        # ('quantile', QuantileTransformer(output_distribution='normal', random_state=42)), # not needed!
        # ('svc', LinearSVC(**params)),
        ('calibrated_svc', CalibratedClassifierCV(LinearSVC(**params))),
    ])

    print("PIPELINE:", [p[0] for p in pipeline.steps], "PARAMS:", params)

    # Stratified CV
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X.values, y, cv=cv, scoring='roc_auc')
    print(f"SVM {n_splits}-FOLD CV AVG AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})\n")

    return cv_scores, pipeline
