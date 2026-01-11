# Wellness Aggregator

A modular health & wellness dashboard that unifies daily metrics (sleep, activity, nutrition, vitals), surfaces correlations/anomalies, and provides actionable experiment prompts.

## Demo Video 
- Video: 

## Features
- Dashboard: key metrics, daily brief, narrative “wellness story”, trends, and pattern cards
- Insights: correlations + anomaly detection with actionable next steps
- Data unification: merged-by-date unified record with source coverage/provenance (demo sources)
- Profile + permissions + goals (stored locally for the prototype)

## Tech Stack
- Frontend: Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- Backend: FastAPI, Pandas/Numpy, SciPy
- Data: demo CSV generation + unified timeseries output

## Getting Started

### Backend
```bash
cd backend
# activate venv (example)
source .venv/bin/activate  # mac/linux
# .venv\Scripts\activate   # windows

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000