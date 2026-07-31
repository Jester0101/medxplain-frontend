"""Runtime inference + SHAP explanation for the persisted CatBoost risk model."""
from typing import Optional

import numpy as np
import pandas as pd

from medicalbigdata.serving.model_io import load_artifact
from medicalbigdata.serving.schema import FEATURE_BY_ID

_cache: dict = {}


def _loaded():
    if "artifact" not in _cache:
        _cache["artifact"] = load_artifact()
    return _cache["artifact"]


def reload_model() -> None:
    """Force re-reading the artifact from disk (e.g. after re-training)."""
    _cache.pop("artifact", None)


def is_model_ready() -> bool:
    return _loaded() is not None


def model_metadata() -> Optional[dict]:
    loaded = _loaded()
    return loaded[1] if loaded else None


def _format_value(fid: str, value) -> str:
    spec = FEATURE_BY_ID.get(fid)
    unit = spec["unit"] if spec else ""
    if fid in ("sex",):
        return "male" if value in (1, "1", "male") else "female"
    if unit and "0/1" in unit:
        return "present" if value in (1, "1", True) else "absent"
    return f"{value} {unit}".strip()


def predict(features: dict) -> dict:
    """features: {feature_id: value or None}. Missing/None values are left as
    NaN -- CatBoost handles missing numeric values natively, and unseen
    categories are treated as a distinct category."""
    loaded = _loaded()
    if loaded is None:
        raise RuntimeError(
            "No trained model found. Run `python -m medicalbigdata.serving.train` first "
            "(requires the LURIC dataset in backend/data/)."
        )
    model, meta = loaded
    feature_ids: list[str] = meta["feature_ids"]
    cat_feature_ids: set[str] = set(meta.get("cat_feature_ids", []))

    row = {}
    for fid in feature_ids:
        v = features.get(fid)
        if fid in cat_feature_ids:
            row[fid] = "unknown" if v is None else str(v)
        else:
            row[fid] = np.nan if v is None else float(v)
    X = pd.DataFrame([row], columns=feature_ids)

    risk = float(model.predict_proba(X)[0, 1])

    import shap  # lazy import: heavy + only needed for /predict

    explainer = shap.TreeExplainer(model)
    explanation = explainer(X)
    contributions = np.asarray(explanation.values[0]).reshape(-1)
    base_margin = float(np.atleast_1d(explanation.base_values)[0])

    def sigmoid(x: float) -> float:
        return 1.0 / (1.0 + np.exp(-x))

    base_value = sigmoid(base_margin)

    factors = []
    for fid, contrib in zip(feature_ids, contributions):
        observed = features.get(fid)
        if observed is None:
            continue  # only surface factors that were actually observed in this patient
        spec = FEATURE_BY_ID[fid]
        factors.append({
            "name": spec["label"],
            "value": _format_value(fid, observed),
            "category": spec["category"],
            "direction": "up" if contrib >= 0 else "down",
            "importance": abs(float(contrib)),
            "impact": f"{spec['label']} {'raises' if contrib >= 0 else 'lowers'} the model's estimated risk.",
            "shapValue": float(contrib),
        })

    max_importance = max((f["importance"] for f in factors), default=0.0) or 1.0
    for f in factors:
        f["importance"] = min(1.0, f["importance"] / max_importance)
    factors.sort(key=lambda f: f["importance"], reverse=True)

    return {"riskValue": risk, "baseValue": base_value, "factors": factors}
