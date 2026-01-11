# backend/app/data/unify.py
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd


@dataclass
class NormalizedDailyRecord:
    # ISO date: "YYYY-MM-DD"
    date: str
    user_id: str = "demo_user"

    sleep_hours: Optional[float] = None
    steps: Optional[int] = None
    active_minutes: Optional[int] = None

    calories: Optional[int] = None
    sugar_g: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None

    resting_hr: Optional[float] = None

    # provenance
    sources_used: Optional[List[str]] = None
    last_sync_iso: Optional[str] = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _opt_float(row: Any, key: str) -> Optional[float]:
    if key not in row or pd.isna(row[key]):
        return None
    try:
        return float(row[key])
    except (TypeError, ValueError):
        return None


def _opt_int(row: Any, key: str) -> Optional[int]:
    if key not in row or pd.isna(row[key]):
        return None
    try:
        return int(row[key])
    except (TypeError, ValueError):
        return None


def _records_from_df(df: pd.DataFrame, source: str) -> List[NormalizedDailyRecord]:
    out: List[NormalizedDailyRecord] = []
    sync = _now_iso()

    for _, row in df.iterrows():
        out.append(
            NormalizedDailyRecord(
                date=pd.to_datetime(row["date"]).date().isoformat(),
                user_id=str(row.get("user_id", "demo_user")),
                sleep_hours=_opt_float(row, "sleep_hours"),
                steps=_opt_int(row, "steps"),
                active_minutes=_opt_int(row, "active_minutes"),
                calories=_opt_int(row, "calories"),
                sugar_g=_opt_float(row, "sugar_g"),
                protein_g=_opt_float(row, "protein_g"),
                carbs_g=_opt_float(row, "carbs_g"),
                fat_g=_opt_float(row, "fat_g"),
                resting_hr=_opt_float(row, "resting_hr"),
                sources_used=[source],
                last_sync_iso=sync,
            )
        )
    return out


def ingest_apple_health(df: pd.DataFrame) -> List[NormalizedDailyRecord]:
    cols = [c for c in ["date", "user_id", "sleep_hours", "steps", "active_minutes", "resting_hr"] if c in df.columns]
    return _records_from_df(df[cols].copy(), source="Apple Health")


def ingest_google_fit(df: pd.DataFrame) -> List[NormalizedDailyRecord]:
    cols = [c for c in ["date", "user_id", "steps", "active_minutes", "sleep_hours"] if c in df.columns]
    return _records_from_df(df[cols].copy(), source="Google Fit")


def ingest_myfitnesspal(df: pd.DataFrame) -> List[NormalizedDailyRecord]:
    cols = [c for c in ["date", "user_id", "calories", "sugar_g", "protein_g", "carbs_g", "fat_g"] if c in df.columns]
    return _records_from_df(df[cols].copy(), source="MyFitnessPal")


PRIORITY: List[str] = ["Apple Health", "Google Fit", "MyFitnessPal"]


def merge_by_date(records_by_source: Dict[str, List[NormalizedDailyRecord]]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Align records by date and resolve per-metric conflicts using PRIORITY.
    Adds provenance fields (sources_used + per-metric __source).
    """
    flattened: List[Dict[str, Any]] = []
    for src, recs in records_by_source.items():
        for r in recs:
            d = asdict(r)
            d["_source"] = src
            flattened.append(d)

    if not flattened:
        return pd.DataFrame(), {"sources": {}, "coverage": {}, "last_sync_iso": None}

    dfa = pd.DataFrame(flattened)
    dfa["date"] = pd.to_datetime(dfa["date"])

    metric_cols = [
        "sleep_hours",
        "steps",
        "active_minutes",
        "calories",
        "sugar_g",
        "protein_g",
        "carbs_g",
        "fat_g",
        "resting_hr",
    ]

    def pick_for_date(day: pd.DataFrame) -> Dict[str, Any]:
        day = day.copy()

        present_sources = sorted(
            set(day["_source"].tolist()),
            key=lambda s: PRIORITY.index(s) if s in PRIORITY else 999,
        )

        user_id_series = day["user_id"].dropna()
        user_id = str(user_id_series.iloc[0]) if not user_id_series.empty else "demo_user"

        sync_vals = [v for v in day["last_sync_iso"].dropna().tolist()]
        last_sync_iso = max(sync_vals) if sync_vals else _now_iso()

        out: Dict[str, Any] = {
            "date": day["date"].iloc[0],
            "user_id": user_id,
            "sources_used": present_sources,
            "last_sync_iso": last_sync_iso,
        }

        for m in metric_cols:
            val = None
            chosen_src = None

            for src in PRIORITY:
                rows = day[day["_source"] == src]
                if rows.empty or m not in rows.columns:
                    continue
                candidate = rows[m].dropna()
                if not candidate.empty:
                    val = candidate.iloc[0]
                    chosen_src = src
                    break

            if val is None and m in day.columns:
                candidate = day[m].dropna()
                if not candidate.empty:
                    idx = candidate.index[0]
                    val = candidate.iloc[0]
                    chosen_src = str(day.loc[idx, "_source"])

            out[m] = val
            out[f"{m}__source"] = chosen_src

        return out

    merged_rows = [pick_for_date(group) for _, group in dfa.groupby("date")]
    dfu = pd.DataFrame(merged_rows).sort_values("date")

    meta = build_sources_status(dfu, records_by_source)
    return dfu, meta


def build_sources_status(
    dfu: pd.DataFrame, records_by_source: Dict[str, List[NormalizedDailyRecord]]
) -> Dict[str, Any]:
    sources: Dict[str, Any] = {}
    for src, recs in records_by_source.items():
        dates = sorted({r.date for r in recs})
        sources[src] = {
            "connected": True,
            "days": len(dates),
            "last_sync_iso": recs[0].last_sync_iso if recs else None,
        }

    def coverage(cols: List[str]) -> Dict[str, Any]:
        if dfu.empty:
            return {"covered_days": 0, "total_days": 0, "pct": 0.0}
        total = len(dfu)
        covered = int(dfu[cols].notna().all(axis=1).sum())
        pct = round((covered / total) * 100, 1) if total else 0.0
        return {"covered_days": covered, "total_days": total, "pct": pct}

    coverage_stats = {
        "sleep+activity": coverage(["sleep_hours", "steps"]),
        "sleep+nutrition": coverage(["sleep_hours", "sugar_g"]),
        "sleep+vitals": coverage(["sleep_hours", "resting_hr"]),
        "activity+nutrition": coverage(["steps", "sugar_g"]),
    }

    last_sync_iso = None
    if not dfu.empty and "last_sync_iso" in dfu.columns:
        vals = [v for v in dfu["last_sync_iso"].dropna().tolist()]
        last_sync_iso = max(vals) if vals else None

    return {"sources": sources, "coverage": coverage_stats, "last_sync_iso": last_sync_iso}