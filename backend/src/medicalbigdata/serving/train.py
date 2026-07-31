"""
Train and persist the CatBoost risk model used by the FastAPI serving app
(`medicalbigdata.serving.app`).

Usage (from backend/, with the serving venv active):

    python -m medicalbigdata.serving.train
    python -m medicalbigdata.serving.train --labels 10YM --test-size 0.25

Requires the restricted LURIC dataset file (see backend/data/NOTE.md) to be
present at backend/data/LURIC_firstobs_2025-03-08.sav -- this script will
print a clear error and exit(1) if it's missing, instead of crashing.

NOTE on the model: we intentionally fit a plain CatBoostClassifier (no
CalibratedClassifierCV wrapper, unlike medicalbigdata.regression.catboost.
pipeline) because shap.TreeExplainer needs direct access to the underlying
trees. If you need calibrated probabilities, calibrate a *separate* copy for
display purposes without touching the model used for SHAP.
"""
import argparse
import os
import sys

from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from medicalbigdata.serving.model_io import ARTIFACT_DIR, save_artifact
from medicalbigdata.serving.schema import CATEGORICAL_FEATURE_IDS, FEATURE_IDS

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
DEFAULT_LURIC_FILE = "LURIC_firstobs_2025-03-08.sav"


def main():
    parser = argparse.ArgumentParser(description="Train the CVD risk model used by the serving API.")
    parser.add_argument("--luric-file", default=DEFAULT_LURIC_FILE,
                         help=f"Filename inside {DATA_DIR}/ (default: %(default)s)")
    parser.add_argument("--labels", choices=["1YM", "10YM"], default="1YM",
                         help="Mortality label horizon to predict (default: %(default)s)")
    parser.add_argument("--test-size", type=float, default=0.2,
                         help="Held-out fraction for the reported AUC (default: %(default)s)")
    parser.add_argument("--iterations", type=int, default=1000)
    parser.add_argument("--learning-rate", type=float, default=0.02)
    parser.add_argument("--depth", type=int, default=5)
    parser.add_argument("--l2-leaf-reg", type=float, default=6.0)
    args = parser.parse_args()

    luric_path = os.path.join(DATA_DIR, args.luric_file)
    if not os.path.exists(luric_path):
        print(f"ERROR: '{luric_path}' not found.", file=sys.stderr)
        print(
            "This is restricted LURIC study data and is intentionally not included in the "
            "repository (see backend/data/NOTE.md).",
            file=sys.stderr,
        )
        print(f"Place '{args.luric_file}' in {DATA_DIR}/ and re-run this script.", file=sys.stderr)
        sys.exit(1)

    # Imported lazily: this pulls in pyreadstat + medicalbigdata.settings, only needed here.
    from catboost import CatBoostClassifier
    from medicalbigdata.settings.luric import labels_1YM, labels_10YM, load_SAV

    print(f"Loading {luric_path} ...")
    df = load_SAV(directory=DATA_DIR, filename=args.luric_file)

    missing = [c for c in FEATURE_IDS if c not in df.columns]
    if missing:
        print(f"ERROR: the LURIC file is missing expected columns: {missing}", file=sys.stderr)
        sys.exit(1)

    X = df[FEATURE_IDS].copy()
    for cid in CATEGORICAL_FEATURE_IDS:
        # CatBoost requires categorical columns as strings; "unknown" mirrors how
        # predict.py encodes a feature that wasn't observed for a given patient.
        X[cid] = X[cid].astype(object).where(X[cid].notna(), "unknown").astype(str)
    y = labels_1YM(df) if args.labels == "1YM" else labels_10YM(df)

    print(f"Dataset: {len(X)} patients, {y.sum()} positive ({args.labels} mortality), {len(FEATURE_IDS)} features.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )

    model = CatBoostClassifier(
        iterations=args.iterations,
        learning_rate=args.learning_rate,
        depth=args.depth,
        l2_leaf_reg=args.l2_leaf_reg,
        cat_features=CATEGORICAL_FEATURE_IDS,
        eval_metric="AUC",
        allow_writing_files=False,
        verbose=False,
    )
    model.fit(X_train, y_train, eval_set=(X_test, y_test))

    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
    print(f"Held-out AUC: {auc:.3f} (n_train={len(X_train)}, n_test={len(X_test)})")

    save_artifact(
        model,
        feature_ids=FEATURE_IDS,
        cat_feature_ids=CATEGORICAL_FEATURE_IDS,
        metrics={
            "holdout_auc": auc,
            "labels": args.labels,
            "n_train": len(X_train),
            "n_test": len(X_test),
        },
    )
    print(f"Saved model + metadata to {ARTIFACT_DIR}/")
    print("Restart (or start) the serving app to pick it up: "
          "uvicorn medicalbigdata.serving.app:app --port 8000")


if __name__ == "__main__":
    main()
