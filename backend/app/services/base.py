from __future__ import annotations
import pandas as pd
from abc import ABC, abstractmethod

class BaseService(ABC):
    name: str

    @abstractmethod
    def load(self, df: pd.DataFrame) -> pd.DataFrame:
        """Return the subset of unified fields this service owns."""
        raise NotImplementedError