from __future__ import annotations
import pandas as pd
from scipy.stats import pearsonr, spearmanr

def compute_correlations(df: pd.DataFrame, pairs: list[tuple[str, str]], lag_days: int = 0) -> list[dict]:
    out = []
    d = df.copy()

    if lag_days != 0:
        # lag y relative to x (x today, y in future)
        for x, y in pairs:
            d[f"{y}_lag"] = d[y].shift(-lag_days)
        pairs_eff = [(x, f"{y}_lag") for x, y in pairs]
    else:
        pairs_eff = pairs

    for (x, y_eff) in pairs_eff:
        clean = d[[x, y_eff]].dropna()
        if len(clean) < 10:
            continue
        xr = clean[x].to_numpy()
        yr = clean[y_eff].to_numpy()

        pr, _ = pearsonr(xr, yr)
        sr, _ = spearmanr(xr, yr)

        out.append({
            "x": x,
            "y": y_eff,
            "lag_days": lag_days,
            "pearson": float(pr),
            "spearman": float(sr),
            "strength": strength_bucket(sr),
            "direction": "positive" if sr > 0 else "negative" if sr < 0 else "neutral",
        })
    return out

def strength_bucket(r: float) -> str:
    ar = abs(r)
    if ar >= 0.6: return "strong"
    if ar >= 0.35: return "moderate"
    if ar >= 0.2: return "weak"
    return "none"