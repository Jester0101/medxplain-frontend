# Serving the CVD risk model

This is a small, CPU-only, macOS-friendly slice of this repo (`medicalbigdata.serving.*`)
that trains a real, explainable (SHAP) CatBoost model on the LURIC dataset and serves it
over HTTP for the `medxplain-frontend` Next.js app. It is independent from the heavy
research stack in `requirements.txt` (vLLM/DeepSpeed/Unsloth, CUDA-only).

## 1. One-time setup

```bash
cd backend
pyenv local 3.12.11          # already done if you ran this before
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-serving.txt
```

## 2. Get the data

Place the restricted LURIC file at:

```
backend/data/LURIC_firstobs_2025-03-08.sav
```

This is non-disclosed study data and is intentionally **not** included in this repo
(see `backend/data/NOTE.md`) — you need access to it separately.

## 3. Train

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=src python -m medicalbigdata.serving.train
```

This fits a `CatBoostClassifier` on the 64 features in
`medicalbigdata.serving.schema.FEATURE_SCHEMA` (age, sex, 45 lab markers, 16 comorbidities —
mirrors `medicalbigdata.settings.luric.FEATURES_60`) against the 1-year mortality label, and
prints a held-out AUC. It saves:

- `backend/models/risk_model.joblib` — the fitted model
- `backend/models/risk_model.meta.json` — feature list, categorical feature list, metrics

Both are gitignored — retrain locally, don't commit them.

Useful flags: `--labels 10YM`, `--test-size 0.25`, `--iterations`, `--learning-rate`, `--depth`,
`--l2-leaf-reg`. Run `python -m medicalbigdata.serving.train --help` for all options.

## 4. Serve

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=src uvicorn medicalbigdata.serving.app:app --reload --port 8000
```

Endpoints:

- `GET /health` — `{ status, model_loaded, meta }`
- `GET /schema` — the canonical feature list (id/label/unit/category); mirrored in the
  frontend at `lib/featureSchema.ts` — keep both in sync if you change
  `medicalbigdata.serving.schema`.
- `POST /predict` — body `{ "features": { "<feature_id>": <value|null>, ... } }` →
  `{ riskValue, baseValue, factors[] }` with real SHAP-derived `direction`/`importance`/
  `shapValue` per factor. Returns `503` if no model has been trained yet.
- `POST /reload` — re-reads the artifact from disk without restarting the process
  (only needed if you re-train while the server is already running with `--reload` off).

## 5. Point the frontend at it

In `medxplain-frontend/.env.local`:

```
RISK_MODEL_URL=http://localhost:8000
```

`/api/assess` in the Next.js app checks this service first (via `lib/predictClient.ts`). If
it's reachable and `model_loaded` is true, the response uses the real trained model + SHAP
factors. Otherwise it transparently falls back to the existing Gemini/OpenRouter-only
estimate (see `lib/llm.ts`) — no code changes needed on either side when you go from
"not trained yet" to "trained".

## Design notes / known simplifications

- The servable model is a plain `CatBoostClassifier`, **not** wrapped in
  `CalibratedClassifierCV` like `medicalbigdata.regression.catboost.pipeline` — SHAP's
  `TreeExplainer` needs direct access to the trees, and calibration wrappers break that.
  If you need calibrated probabilities for reporting, calibrate a separate copy and keep
  this one for SHAP.
- Missing values: numeric features use CatBoost's native NaN handling; categorical
  features (comorbidities + sex) fall back to the string `"unknown"` both at train time
  (for real NaNs in LURIC) and at serving time (for anything the note-extraction step
  didn't find) — keeps train/serve preprocessing symmetric.
- `baseValue` is `sigmoid(shap_base_margin)`, i.e. an approximation of the average
  predicted risk in the training set — treat it as indicative, not exact.
