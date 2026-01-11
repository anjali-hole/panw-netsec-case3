from __future__ import annotations
import pandas as pd
from app.services.base import BaseService

class ActivityService(BaseService):
    name = "activity"

    def load(self, df: pd.DataFrame) -> pd.DataFrame:
        cols = ["date", "steps", "active_minutes"]
        return df[cols].copy()