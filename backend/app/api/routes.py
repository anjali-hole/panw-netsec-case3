# backend/app/api/routes.py
from fastapi import APIRouter, Depends, Query

from app.analytics.insights import build_insights
from app.data.generate_demo_data import ensure_demo_data
from app.services.registry import ServiceRegistry

router = APIRouter()


def get_registry() -> ServiceRegistry:
    return ServiceRegistry()


@router.post("/demo/seed")
def seed_demo(days: int = Query(default=90, ge=14, le=365)) -> dict:
    path = ensure_demo_data(days=days)
    return {"ok": True, "data_path": str(path)}


@router.get("/dashboard/summary")
def dashboard_summary(
    range_days: int = Query(default=30, ge=7, le=180),
    registry: ServiceRegistry = Depends(get_registry),
) -> dict:
    df = registry.load_unified(range_days=range_days)
    return registry.kpi_summary(df)


@router.get("/dashboard/timeseries")
def dashboard_timeseries(
    range_days: int = Query(default=30, ge=7, le=180),
    registry: ServiceRegistry = Depends(get_registry),
) -> dict:
    df = registry.load_unified(range_days=range_days)
    return {"series": registry.to_timeseries(df)}


@router.get("/insights")
def get_insights(
    range_days: int = Query(default=30, ge=7, le=180),
    registry: ServiceRegistry = Depends(get_registry),
) -> dict:
    df = registry.load_unified(range_days=range_days)
    cards = build_insights(df)
    return {"insights": cards}


@router.get("/sources/status")
def sources_status(
    range_days: int = Query(default=30, ge=7, le=180),
    registry: ServiceRegistry = Depends(get_registry),
) -> dict:
    # load_unified populates internal metadata used by sources_status()
    _ = registry.load_unified(range_days=range_days)
    return registry.sources_status()