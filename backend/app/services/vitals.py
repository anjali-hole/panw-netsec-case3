from __future__ import annotations
import pandas as pd
from app.services.base import BaseService

class VitalsService(BaseService):
    name = "vitals"

    def load(self, df: pd.DataFrame) -> pd.DataFrame:
        cols = ["date", "resting_hr"]
        if "hrv_ms" in df.columns:
            cols.append("hrv_ms")
        return df[cols].copy()