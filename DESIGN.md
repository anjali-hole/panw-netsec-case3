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
- Each data source is implemented as an independent ingestion adapter.
- New health services or metrics can be added without modifying downstream analytics or UI components.
- This design reflects the evolving nature of health data and supports future expansion with minimal refactoring.

### Frontend modularity
- Reusable card components
- Centralized local storage helpers (profile/permissions/settings/goals)
- Page-level fetch orchestration with clean loading + empty states
- Paves the way for future enhancements like allowing customizable dashboards for the user by simply removing a card.

### Baseline-Driven Experiment Design
- Experiments are evaluated relative to a rolling personal baseline rather than fixed thresholds.
- This allows insights to adapt to individual norms instead of population averages.
- While experiments are currently baseline-driven, the system already supports future goal-based evaluation through the Goals configuration in Settings.

## 4. API Contract (Summary)
- `GET /v1/dashboard/summary?range_days=30` → KPI averages
- `GET /v1/dashboard/timeseries?range_days=30` → timeseries arrays
- `GET /v1/insights?range_days=30` → insight cards (correlation/anomaly)
- `GET /v1/sources/status?range_days=30` → source coverage + last sync
- `POST /v1/demo/seed?days=90` → generate demo dataset

## 5. Reliability / Error Handling
- Frontend: guarded fetch + fallback empty states for “no data / backend down”
- Backend: query constraints for ranges, defensive numeric coercion for analytics

## 6. Responsible AI & Ethical Considerations

This system is intentionally designed to provide **decision support**, not medical advice.

### Evidence-Based, Personal Trends Only
- All insights are derived from the user’s own historical numerical data (sleep, activity, nutrition, vitals).
- No external medical knowledge bases or generalized population health advice are used.
- This avoids overgeneralized or misleading recommendations that can arise from chatbot-style systems.

### Clear Boundaries on Medical Guidance
- Correlations and anomalies are presented as *directional signals*, not diagnoses.
- All insight cards include disclaimers clarifying that correlation does not imply causation.
- Actionable recommendations are intentionally small, reversible, and low-risk (e.g., short experiments rather than directives).

### Transparency & User Control
- Explanations are surfaced alongside insights to show *why* a pattern was detected.
- In future iterations, users will be able to toggle explanations on or off to reduce cognitive load while preserving trust.

### Data Sufficiency & Safety
- Insights are suppressed when insufficient data exists (e.g., minimum day thresholds).
- Missing data is explicitly surfaced rather than silently imputed, reducing false confidence.

## 7. Privacy & Data Minimization

The system is designed to minimize collection and retention of sensitive personal health information.

- The prototype operates entirely on demo data or locally scoped user preferences.
- No personally identifiable health information (PHI) is persisted on the backend.
- User profiles and settings are stored locally and scoped by anonymized identifiers.
- In future authenticated versions, user identifiers would be hashed before storage, ensuring that raw identities are never directly stored alongside health data.

This approach reduces risk while still enabling meaningful personalization.

## 8. Challenges & Trade-offs

### Data Fragmentation & Incomplete Coverage
Health data sources rarely align perfectly. Some provide sleep but not nutrition, others provide activity with gaps. A key challenge was unifying these streams without fabricating or over-smoothing missing values, even though the test data being used wasnt as complicated

**Trade-off:** Missing data is preserved explicitly and surfaced in the UI rather than imputed, prioritizing correctness over completeness.

---

### Avoiding Overreach in Health Insights
Health-related insights can easily drift into medical advice when AI is involved.

**Trade-off:**  
Insights are framed as correlations and trends, not diagnoses. Actions are designed to be low-risk, reversible, and testable over short windows.

---

### Personalization Without Sensitive Data
Providing meaningful personalization typically requires deep personal or medical context, which introduces privacy risk.

**Trade-off:**  
The system relies solely on anonymized numerical trends and rolling personal baselines. This limits contextual richness but significantly improves privacy and safety.

---

### Baseline Selection & Signal Stability
What constitutes “normal” behavior varies widely across users and time windows.

**Trade-off:**  
Rolling baselines and persistence thresholds are used to reduce false positives, at the cost of slower detection for short-lived events.

---

### Frontend State Synchronization
Managing profiles, permissions, goals, and experiments entirely on the client introduces synchronization challenges across pages and tabs.

**Trade-off:**  
Centralized storage utilities and explicit storage events were introduced to maintain consistency without adding backend complexity.

---

### Prototype vs. Production Scope
Building a functional prototype within time constraints required intentional omission of some production-grade features.

**Trade-off:**  
Authentication, persistent storage, and real-time ingestion were deferred to focus on demonstrating modular architecture, analytics, and responsible AI principles.

## Key Learnings

- Small, well-scoped insights are safer and more actionable than broad health recommendations.
- Personal baselines provide stronger signal than population averages for behavior change.
- Transparency and explainability are essential when applying AI in health-related domains.
- Modular system design significantly reduces the cost of experimentation and iteration.

## 9. Future Work

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