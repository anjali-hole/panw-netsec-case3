# Wellness Aggregator – Design Documentation

## 1. Goal
Provide a single dashboard that aggregates wellness signals (sleep, activity, nutrition, vitals), detects patterns (correlations/anomalies), and suggests small, testable next steps.

## 2. Architecture Overview
**Frontend (Next.js)**
- Pages: `/dashboard`, `/insights`, `/login`, `/settings`
- Components: card-based UI modules (KPI, Trends, Story, Daily Brief, etc.)
- Lib: API client + storage utilities + actionable logic

**Backend (FastAPI)**
- Routes: health check + dashboard/insights/status endpoints under `/v1`
- Data layer: demo CSV generation
- Unification: normalize + merge-by-date with source provenance
- Analytics: rolling z-score anomalies + correlation calculations

## 3. Key Design Choices
### Modular pipeline
- Data ingestion adapters per source (demo: Apple Health, Google Fit, MyFitnessPal)
- Unified “one row per day” record with provenance tracking
- Analytics layer runs on unified output so UI has a stable contract

### Frontend modularity
- Reusable card components
- Centralized local storage helpers (profile/permissions/settings/goals)
- Page-level fetch orchestration with clean loading + empty states

## 4. API Contract (Summary)
- `GET /v1/dashboard/summary?range_days=30` → KPI averages
- `GET /v1/dashboard/timeseries?range_days=30` → timeseries arrays
- `GET /v1/insights?range_days=30` → insight cards (correlation/anomaly)
- `GET /v1/sources/status?range_days=30` → source coverage + last sync
- `POST /v1/demo/seed?days=90` → generate demo dataset

## 5. Reliability / Error Handling
- Frontend: guarded fetch + fallback empty states for “no data / backend down”
- Backend: query constraints for ranges, defensive numeric coercion for analytics

## 6. Future Work

This prototype focuses on demonstrating modular data unification, analytics, and actionable insights. Several production-grade enhancements are intentionally out of scope but planned for future iterations.

### Authentication & Identity
- Add secure authentication (OAuth / JWT-based sessions) to associate data with real users.
- Support multiple authenticated profiles per account instead of local-only profiles.
- Integrate third-party identity providers for health platforms where applicable.

### Scalability & Backend Architecture
- Replace CSV-based demo data with a persistent datastore (e.g., PostgreSQL or time-series DB).
- Introduce background jobs for ingestion and analytics computation.
- Add API-level caching and pagination to support larger datasets and higher request volume.
- Define a clearer service boundary between ingestion, unification, analytics, and delivery layers.

### Accessibility & UI Enhancements
- Add full dark mode support with persisted user preference.
- Improve reduced-motion handling and ARIA coverage for assistive technologies.
- Expand keyboard navigation and screen-reader-friendly layouts.

### Advanced Health Features (inspired by prior work)
- Real-time syncing instead of batch ingestion.
- Longitudinal trend comparison across weeks/months.
- Goal-based alerts (e.g., sustained deviation from targets).
- Personalized recommendations informed by historical behavior rather than static rules.

### Experiments & Insights
- Expand experiment engine to support multi-variable experiments.
- Persist experiment results for longitudinal evaluation.
- Add confidence indicators and data sufficiency checks to insights.

### Testing & Reliability
- Add unit tests for analytics functions and unification logic.
- Add integration tests for API contracts.
- Add runtime monitoring and structured logging.

These improvements would transition the prototype into a production-ready system while preserving the modular architecture demonstrated here.