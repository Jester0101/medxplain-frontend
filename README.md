# MedXplain

Cardiovascular risk assessment with SHAP-style factor attribution. Enter a clinical note, get a 1-year risk score with visual explanations of what drives it up or down.

## Prerequisites

- **Node.js** 20+
- **Yarn** (ships with the repo via `packageManager` field)
- **Gemini API key** (for the LLM-based assessment)

Optional (for trained model mode):

- Python 3.12, the LURIC dataset, and the backend server (see `backend/SERVING.md`)

## Quick start

```bash
# 1. Install dependencies
yarn install

# 2. Create environment file
cp .env.local.example .env.local
# Edit .env.local and set your GEMINI_API_KEY

# 3. Run dev server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable         | Required | Description                                                         |
| ---------------- | -------- | ------------------------------------------------------------------- |
| `GEMINI_API_KEY` | Yes      | Google Gemini API key                                               |
| `GEMINI_MODEL`   | No       | Model ID (default: `gemini-3-flash-preview`)                        |
| `RISK_MODEL_URL` | No       | URL of the trained model backend (default: `http://localhost:8000`) |

## Production build

```bash
yarn build
yarn start
```

The app runs on port 3000 by default. Use `PORT=8080 yarn start` to change it.

## With the trained model (optional)

If you have the LURIC dataset and want real SHAP explanations instead of LLM estimates:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-serving.txt
PYTHONPATH=src python -m medicalbigdata.serving.train
PYTHONPATH=src uvicorn medicalbigdata.serving.app:app --port 8000
```

The frontend detects the backend automatically and uses real model predictions when available. See `backend/SERVING.md` for details.

## Project structure

```text
app/              Next.js pages and API routes
components/       React components (charts, cohort, chat, UI)
lib/              Utilities, API clients, data contracts
public/           Static assets (cohort data)
backend/          Python backend for trained model serving
```
