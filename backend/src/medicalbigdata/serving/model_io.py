"""Persistence for the trained risk model artifact."""
import json
import os

import joblib

# backend/src/medicalbigdata/serving/model_io.py -> backend/models
ARTIFACT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "models"))
MODEL_PATH = os.path.join(ARTIFACT_DIR, "risk_model.joblib")
META_PATH = os.path.join(ARTIFACT_DIR, "risk_model.meta.json")


def save_artifact(model, feature_ids: list[str], cat_feature_ids: list[str], metrics: dict) -> None:
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    meta = {"feature_ids": feature_ids, "cat_feature_ids": cat_feature_ids, "metrics": metrics}
    with open(META_PATH, "w") as f:
        json.dump(meta, f, indent=2)


def load_artifact():
    """Returns (model, meta) or None if no trained model exists yet."""
    if not (os.path.exists(MODEL_PATH) and os.path.exists(META_PATH)):
        return None
    model = joblib.load(MODEL_PATH)
    with open(META_PATH) as f:
        meta = json.load(f)
    return model, meta
