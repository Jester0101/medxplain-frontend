"""
CPU-only tests for llm_explain.py, using the exact example patient from
backend/notebooks/ShapleyGeminiRequests.ipynb so the port can be verified
without a GPU/vLLM (the notebook's own Gemini response for this patient is
reused as the "factors" input, standing in for what a fine-tuned Med42 model
would return in the same structured format).

Run with: PYTHONPATH=src pytest src/medicalbigdata/serving/test_llm_explain.py -v
"""
from medicalbigdata.serving.llm_explain import custom_tokenizer, explain_text, risk_logit

NOTE = (
    "The patient is a 67-year old male who underwent coronary angiography, presenting with "
    "a NT-proBNP level of 173.0 ng/ml; a CRP level of 0.1 mg/dL, having a history of "
    "coronary artery disease (CAD); peripheral vascular disease (PVD); valve disease."
)

FACTORS = [
    {"factor_name": "age", "risk_score": 65, "explanation": "Advanced age raises CVD risk."},
    {"factor_name": "coronary artery disease (CAD)", "risk_score": 90,
     "explanation": "Established CAD is a strong CVD risk indicator."},
    {"factor_name": "peripheral vascular disease (PVD)", "risk_score": 75,
     "explanation": "PVD indicates systemic atherosclerosis."},
    {"factor_name": "CRP", "risk_score": 20, "explanation": "CRP is within a low, reassuring range."},
]


def test_custom_tokenizer_splits_on_expected_delimiters():
    tokens = custom_tokenizer(NOTE)
    assert tokens[0].startswith("The patient is a 67-year old male")
    assert any("NT-proBNP" in t for t in tokens)
    assert any("coronary artery disease" in t for t in tokens)
    assert any("valve disease" in t for t in tokens)
    # no empty or duplicate tokens
    assert all(t.strip() for t in tokens)
    assert len(tokens) == len(set(tokens))


def test_risk_logit_is_monotonic_and_bounded():
    assert risk_logit(0) < risk_logit(25) < risk_logit(50) < risk_logit(75) < risk_logit(100)
    # clamps out-of-range input instead of raising
    assert risk_logit(-10) == risk_logit(0)
    assert risk_logit(150) == risk_logit(100)


def test_explain_text_matches_known_factors_to_their_spans():
    result = explain_text(NOTE, FACTORS, overall_risk_pct=62)
    spans = result["spans"]

    assert len(spans) == len(custom_tokenizer(NOTE))

    cad_span = next(s for s in spans if "coronary artery disease" in s["text"])
    assert cad_span["display"] == "Established CAD is a strong CVD risk indicator."
    assert cad_span["value"] == risk_logit(90)

    pvd_span = next(s for s in spans if "peripheral vascular disease" in s["text"])
    assert pvd_span["value"] == risk_logit(75)

    # a span with no strong match (e.g. valve disease, not in FACTORS) falls back to the default
    valve_span = next(s for s in spans if "valve disease" in s["text"])
    assert valve_span["display"] == "No specific indication."
    assert valve_span["value"] == risk_logit(25)

    assert result["base_value"] == risk_logit(62)


def test_explain_text_handles_no_factors_gracefully():
    result = explain_text(NOTE, [], overall_risk_pct=10)
    assert all(s["display"] == "No specific indication." for s in result["spans"])
