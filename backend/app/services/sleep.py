from __future__ import annotations
import pandas as pd
from app.services.base import BaseService

class SleepService(BaseService):
    name = "sleep"

    def load(self, df: pd.DataFrame) -> pd.DataFrame:
        cols = ["date", "sleep_hours"]
        if "sleep_quality" in df.columns:
            cols.append("sleep_quality")
        return df[cols].copy()