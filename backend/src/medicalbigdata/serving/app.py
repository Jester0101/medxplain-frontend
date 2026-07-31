from typing import Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from medicalbigdata.serving import predict as predict_mod
from medicalbigdata.serving.schema import FEATURE_SCHEMA

app = FastAPI(title="MedXplain Risk Model API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    features: dict[str, Optional[Union[float, str]]]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predict_mod.is_model_ready(),
        "meta": predict_mod.model_metadata(),
    }


@app.get("/schema")
def schema():
    return {"features": FEATURE_SCHEMA}


@app.post("/reload")
def reload():
    predict_mod.reload_model()
    return {"model_loaded": predict_mod.is_model_ready()}


@app.post("/predict")
def predict(req: PredictRequest):
    if not predict_mod.is_model_ready():
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not trained yet. Run `python -m medicalbigdata.serving.train` in backend/ "
                "with the LURIC dataset present, then POST /reload or restart this server."
            ),
        )
    try:
        return predict_mod.predict(req.features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
