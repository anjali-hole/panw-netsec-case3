from __future__ import annotations
import pandas as pd
from app.services.base import BaseService

class NutritionService(BaseService):
    name = "nutrition"

    def load(self, df: pd.DataFrame) -> pd.DataFrame:
        cols = ["date", "calories", "sugar_g"]
        for c in ["protein_g", "carbs_g", "fat_g"]:
            if c in df.columns:
                cols.append(c)
        return df[cols].copy()