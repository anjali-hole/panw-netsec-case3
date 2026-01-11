from __future__ import annotations
import pandas as pd

def rolling_z_anomalies(
    df: pd.DataFrame,
    metric: str,
    window: int = 30,
    z_thresh: float = 1.8,
    min_persist: int = 2,
) -> list[dict]:
    d = df.copy()
    d[metric] = pd.to_numeric(d[metric], errors="coerce")
    d["mean"] = d[metric].rolling(window=window, min_periods=max(10, window//2)).mean()
    d["std"]  = d[metric].rolling(window=window, min_periods=max(10, window//2)).std()
    d["z"] = (d[metric] - d["mean"]) / d["std"]

    flagged = d[(d["z"].abs() >= z_thresh) & d["z"].notna()].copy()
    if flagged.empty:
        return []

    # Persistence: group consecutive days
    flagged["date"] = pd.to_datetime(flagged["date"])
    flagged = flagged.sort_values("date")
    groups = []
    cur = [flagged.iloc[0]]
    for i in range(1, len(flagged)):
        prev = flagged.iloc[i-1]["date"]
        now  = flagged.iloc[i]["date"]
        if (now - prev).days == 1:
            cur.append(flagged.iloc[i])
        else:
            groups.append(cur)
            cur = [flagged.iloc[i]]
    groups.append(cur)

    anomalies = []
    for g in groups:
        if len(g) < min_persist:
            continue
        first = g[0]
        last  = g[-1]
        anomalies.append({
            "metric": metric,
            "start_date": first["date"].date().isoformat(),
            "end_date": last["date"].date().isoformat(),
            "days": len(g),
            "z_max": float(max(abs(x["z"]) for x in g)),
            "baseline_mean": float(first["mean"]),
            "baseline_std": float(first["std"]) if pd.notna(first["std"]) else None,
        })
    return anomalies