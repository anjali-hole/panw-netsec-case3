from __future__ import annotations
import pandas as pd
from app.analytics.correlations import compute_correlations
from app.analytics.anomalies import rolling_z_anomalies

def build_insights(df: pd.DataFrame) -> list[dict]:
    # Pick a small set of pairs 
    pairs = [
        ("sleep_hours", "sugar_g"),
        ("sleep_hours", "steps"),
        ("active_minutes", "sleep_hours"),
        ("sleep_hours", "resting_hr"),
    ]

    corr_same = compute_correlations(df, pairs, lag_days=0)
    corr_lag1 = compute_correlations(df, [("sleep_hours", "sugar_g")], lag_days=1)

    # Keep top correlations by |spearman|
    corr_all = corr_same + corr_lag1
    corr_all.sort(key=lambda x: abs(x["spearman"]), reverse=True)
    top_corr = [c for c in corr_all if c["strength"] != "none"][:2]

    anomalies = []
    anomalies += rolling_z_anomalies(df, "resting_hr", window=30, z_thresh=1.8, min_persist=2)
    anomalies += rolling_z_anomalies(df, "sleep_hours", window=30, z_thresh=1.8, min_persist=2)

    cards = []
    for c in top_corr:
        cards.append({
            "id": f"corr:{c['x']}:{c['y']}:{c['lag_days']}",
            "type": "correlation",
            "title": correlation_title(c),
            "summary": correlation_summary(c),
            "evidence": {
            "x": c["x"],
            "y": c["y"],
            "metric_y": c["y"].replace("_lag",""),
            "lag_days": c["lag_days"],
            "pearson": c["pearson"],
            "spearman": c["spearman"],
            },
            "responsible_note": "Correlation does not imply causation.",
        })

    for a in anomalies[:1]:
        cards.append({
            "id": f"anom:{a['metric']}:{a['start_date']}:{a['end_date']}",
            "type": "anomaly",
            "title": f"Anomalous pattern detected: {a['metric']}",
            "summary": f"{a['metric']} deviated from your rolling baseline for {a['days']} consecutive days.",
            "evidence": a,
            "responsible_note": "This is not medical advice; anomalies can have benign causes.",
        })

    return cards

def correlation_title(c: dict) -> str:
    base = f"{pretty(c['x'])} ↔ {pretty(c['y'].replace('_lag',''))}"
    if c["lag_days"] == 1:
        return f"{base} (next-day relationship)"
    return base

def correlation_summary(c: dict) -> str:
    x = pretty(c["x"])
    y = pretty(c["y"])
    if c["spearman"] > 0:
        return f"When {x} is higher, {y} tends to be higher (Spearman {c['spearman']:.2f})."
    if c["spearman"] < 0:
        return f"When {x} is lower, {y} tends to be higher (Spearman {c['spearman']:.2f})."
    return f"No clear relationship detected between {x} and {y}."

def pretty(s: str) -> str:
    s = s.replace("_lag", "")
    mapping = {
        "sleep_hours": "Sleep (hours)",
        "steps": "Steps",
        "active_minutes": "Active Minutes",
        "calories": "Calories",
        "sugar_g": "Sugar (g)",
        "protein_g": "Protein (g)",
        "carbs_g": "Carbs (g)",
        "fat_g": "Fat (g)",
        "resting_hr": "Resting HR",
        "hrv_ms": "HRV (ms)",
        "mood": "Mood",
        "date": "Date",
    }
    return mapping.get(s, s.replace("_", " ").title())