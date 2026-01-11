# backend/app/services/registry.py
from __future__ import annotations

import pandas as pd
from app.data.generate_demo_data import ensure_demo_data
from app.data.unify import (
    ingest_apple_health,
    ingest_google_fit,
    ingest_myfitnesspal,
    merge_by_date,
)
# in app/services/registry.py
from app.services.sleep import SleepService
from app.services.activity import ActivityService
from app.services.nutrition import NutritionService
from app.services.vitals import VitalsService

class ServiceRegistry:
    def __init__(self) -> None:
        self._last_meta = None
        self._services = {
            "sleep": SleepService(),
            "activity": ActivityService(),
            "nutrition": NutritionService(),
            "vitals": VitalsService(),
        }

    def service_views(self, df: pd.DataFrame) -> dict:
        return {name: svc.load(df) for name, svc in self._services.items()}

class ServiceRegistry:
    def __init__(self):
        self._last_meta = None

    def load_unified(self, range_days: int = 30) -> pd.DataFrame:
        path = ensure_demo_data()
        df = pd.read_csv(path)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").tail(max(range_days, 30)).copy()

        # Mock disparate sources 
        apple = df[["date","user_id","sleep_hours","steps","active_minutes","resting_hr"]].copy()

        # google fit: fewer fields + occasional missing days
        google = df[["date","user_id","steps","active_minutes"]].copy()
        google.loc[google.index[::6], "steps"] = None  # drop some days to simulate gaps

        # myfitnesspal: nutrition fields, some gaps
        mfp_cols = ["date","user_id","calories","sugar_g","protein_g","carbs_g","fat_g"]
        mfp = df[mfp_cols].copy()
        mfp.loc[mfp.index[::5], "sugar_g"] = None

        records_by_source = {
            "Apple Health": ingest_apple_health(apple),
            "Google Fit": ingest_google_fit(google),
            "MyFitnessPal": ingest_myfitnesspal(mfp),
        }

        unified, meta = merge_by_date(records_by_source)
        self._last_meta = meta

        # apply requested window after merge
        unified = unified.sort_values("date").tail(range_days).copy()
        return unified

    def sources_status(self) -> dict:
        return self._last_meta or {"sources": {}, "coverage": {}, "last_sync_iso": None}

    def kpi_summary(self, df: pd.DataFrame) -> dict:
        def safe_mean(col: str, ndigits: int = 2):
            if col not in df.columns:
                return None
            v = df[col].dropna()
            if v.empty:
                return None
            return round(float(v.mean()), ndigits)

        def safe_int_mean(col: str):
            if col not in df.columns:
                return None
            v = df[col].dropna()
            if v.empty:
                return None
            return int(v.mean())

        return {
            "avg_sleep_hours": safe_mean("sleep_hours", 2),
            "avg_steps": safe_int_mean("steps"),
            "avg_calories": safe_int_mean("calories"),
            "avg_sugar_g": safe_mean("sugar_g", 1),
        }

    def to_timeseries(self, df: pd.DataFrame) -> dict:
        def col_list(c: str):
            if c not in df.columns:
                return [None] * len(df)
            return [None if pd.isna(x) else float(x) for x in df[c].tolist()]

        return {
            "date": [d.date().isoformat() for d in pd.to_datetime(df["date"])],
            "sleep_hours": col_list("sleep_hours"),
            "steps": col_list("steps"),
            "active_minutes": col_list("active_minutes"),
            "calories": col_list("calories"),
            "sugar_g": col_list("sugar_g"),
            "resting_hr": col_list("resting_hr"),
        }