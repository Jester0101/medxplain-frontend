import re
from difflib import SequenceMatcher
from typing import TypedDict

from scipy.special import logit as _logit


class Factor(TypedDict):
    factor_name: str
    risk_score: float  # 0-100
    explanation: str


class Span(TypedDict):
    text: str
    value: float  # logit-space "SHAP-like" contribution
    display: str  # tooltip text (the matched factor's explanation, or a default)


def custom_tokenizer(text: str) -> list[str]:
    """Splits a LURIC-style prompt sentence into clinically meaningful spans.

    Ported verbatim (behavior-wise) from the notebook's `custom_tokenizer`.
    """
    tokens = []
    for t in re.split(r"who underwent coronary angiography, presenting with|, having a history of|;", text):
        t = t.strip()
        if t and t not in tokens:
            tokens.append(t)
    return tokens


def risk_logit(pct: float) -> float:
    """pct in [0, 100] -> logit space, matching the notebook's `logit()` helper
    (clamped and offset by 0.1 to avoid exactly 0/1 -> +/-inf)."""
    clamped = max(0.0, min(pct, 100.0))
    return float(_logit(0.5 + clamped / 200.1))


def explain_text(prompt: str, factors: list[Factor], overall_risk_pct: float) -> dict:
    """
    Maps `factors` (as returned by the LLM's structured risk assessment) back
    onto spans of `prompt` via fuzzy matching, for a token-highlighted view.

    Returns {"base_value": float, "spans": [Span, ...]}.
    """
    tokens = custom_tokenizer(prompt)
    base = risk_logit(overall_risk_pct)

    spans: list[Span] = []
    for t in tokens:
        best_size = 0
        best_factor: Factor | None = None
        for f in factors:
            match = SequenceMatcher(None, f["factor_name"], t).find_longest_match()
            if match.size > len(f["factor_name"]) * 0.65 and match.size > best_size:
                best_size = match.size
                best_factor = f
        if best_factor:
            spans.append({"text": t, "value": risk_logit(best_factor["risk_score"]), "display": best_factor["explanation"]})
        else:
            spans.append({"text": t, "value": risk_logit(25), "display": "No specific indication."})

    return {"base_value": base, "spans": spans}
