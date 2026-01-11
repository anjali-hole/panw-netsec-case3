from __future__ import annotations
from pathlib import Path
import numpy as np
import pandas as pd
from datetime import date, timedelta

DATA_PATH = Path(__file__).resolve().parent / "demo_data.csv"

def ensure_demo_data(days: int = 90) -> Path:
    if DATA_PATH.exists():
        return DATA_PATH
    df = generate_demo_data(days=days)
    df.to_csv(DATA_PATH, index=False)
    return DATA_PATH

def generate_demo_data(days: int = 90) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    start = date.today() - timedelta(days=days-1)
    dates = [start + timedelta(days=i) for i in range(days)]

    # Sleep: base around 7h with noise + occasional dips
    sleep = np.clip(rng.normal(7.0, 0.9, size=days), 4.0, 9.5)
    dip_idx = rng.choice(days, size=max(2, days//20), replace=False)
    sleep[dip_idx] = np.clip(sleep[dip_idx] - rng.uniform(1.0, 2.0, size=len(dip_idx)), 4.0, 9.5)

    # Activity: steps influenced by sleep quality a bit
    steps = np.clip(rng.normal(8500, 1800, size=days) + (sleep - 7.0) * 600, 1500, 16000).astype(int)
    active_min = np.clip(rng.normal(45, 18, size=days) + (steps - 8500)/400, 5, 120).astype(int)

    # Nutrition: sugar tomorrow increases when sleep today is low 
    sugar = np.clip(rng.normal(45, 12, size=days), 10, 120)
    for i in range(days-1):
        if sleep[i] < 6.0:
            sugar[i+1] += rng.uniform(10, 25)
    sugar = np.clip(sugar, 10, 140)

    calories = np.clip(rng.normal(2100, 250, size=days) + (sugar - 45)*4, 1400, 3400).astype(int)
    protein = np.clip(rng.normal(110, 25, size=days), 50, 190)
    carbs = np.clip(rng.normal(240, 50, size=days) + (sugar - 45)*1.2, 100, 420)
    fat = np.clip(rng.normal(70, 18, size=days), 30, 130)

    # Vitals: resting HR rises when sleep is low + after high activity clusters
    rhr = np.clip(rng.normal(62, 4, size=days) + (6.5 - sleep)*1.3 + (active_min > 75)*2.0, 50, 85)

    # Mood decreases with low sleep
    mood = np.clip(rng.normal(3.6, 0.5, size=days) - (6.0 - sleep)*0.2, 1.0, 5.0)

    df = pd.DataFrame({
        "date": [d.isoformat() for d in dates],
        "sleep_hours": np.round(sleep, 2),
        "steps": steps,
        "active_minutes": active_min,
        "calories": calories,
        "protein_g": np.round(protein, 1),
        "carbs_g": np.round(carbs, 1),
        "fat_g": np.round(fat, 1),
        "sugar_g": np.round(sugar, 1),
        "resting_hr": np.round(rhr, 1),
        "mood": np.round(mood, 1),
        "user_id": ["demo_user"] * days,
    })
    return df