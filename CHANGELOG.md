# AquaAlert AI Changelog

## [Phase 1: Foundation] - In Progress
### Added
- Monorepo setup with React/Vite (web) and FastAPI/SQLModel (api)
- Tailwind CSS design system with "Bioluminescent night river" theme
- Basic SQLModel models and database seeded with mock data
- Dummy Authentication for 3 roles: Citizen, Reviewer, Authority
- Styleguide route for component demonstration
- API OpenAPI docs at `/docs`

## [Phase 2: Citizen report flow and AI assessment] - In Progress
### Added
- 4-Step Citizen Report Wizard (`/report`)
  - Capture Step: Client-side downscaling and video frame extraction preview.
  - Place Step: Leaflet Map geolocation with auto-snap to nearest water body.
  - Describe Step: Semantic category chips and safety banner.
  - Scan Step: Simulated AI scanning animation with confidence rings.
- Draft persistence in `localStorage` for offline resilience.
- Priority Rules Engine in API (`rules.py`) with unit tests.
- AI Provider abstraction (`ai.py`) with Mock provider and RealVision provider stub.
- Report Detail screen showcasing AI confidence bars, timeline, and rules triggered.
