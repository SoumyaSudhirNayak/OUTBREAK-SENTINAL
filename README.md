# Rural Health Sentinel

Rural Health Sentinel is a logistics and operations platform for outbreak response. It connects three roles in a single workflow:

- Admin: monitors outbreaks, dispatches mobile medical units, and tracks routes
- Doctor: monitors outbreak status, capacity constraints, and resource availability
- Mobile Van team: receives assignments, navigates to outbreak locations, and logs treatment and stock usage

This project was built during the 24-hour hackathon conducted by KL University, titled "HackwithAI".

Team name: RAGNAROK

Team members:

- Somya Sudhir Nayak (lead)
- Indrakanti Kevin 
- Shaik Abid
- Kantrpally Rishith

## Problem statement

During a disease outbreak, response time and resource coordination determine outcomes. In rural settings, decision-makers often lack:

- a unified view of outbreak reports and severity hotspots
- a dispatch system that selects the best available vehicle and route using traffic conditions
- real-time visibility into mobile unit progress and on-ground capacity
- reliable tracking of medicine and equipment consumption vs remaining stock

Rural Health Sentinel addresses these gaps by combining map-based situational awareness, traffic-aware routing, role-based dashboards, and realtime updates.

## What the system does

- Outbreak reporting and visualization (map + severity)
- Vehicle registration and live tracking
- Allocation of a mobile vehicle to an outbreak using Mapbox Directions with traffic-aware ETA
- Route persistence for map rendering (GeoJSON) and live navigation updates
- Assignment lifecycle (pending, accepted, rejected, completed)
- Treatment and stock usage logging from the van
- Central resource availability updates (medicines and equipment) based on usage logs
- Realtime refresh of doctor resources and treatment metrics via WebSockets

## Outputs
<img width="1919" height="871" alt="Screenshot 2026-03-07 225428" src="https://github.com/user-attachments/assets/d90989d1-1c8b-4939-b70e-0461a1d3566a" />
<img width="1919" height="872" alt="Screenshot 2026-03-07 225504" src="https://github.com/user-attachments/assets/c959cb25-9632-4e60-83f7-1333fb42e451" />
<img width="1919" height="1079" alt="Screenshot 2026-03-07 222215" src="https://github.com/user-attachments/assets/fe84274a-1581-4aa5-ac1d-54fb398a8840" />
<img width="1919" height="1079" alt="Screenshot 2026-03-07 222235" src="https://github.com/user-attachments/assets/0e5a7265-c736-481c-b731-e58dcad20821" />
<img width="1919" height="1079" alt="Screenshot 2026-03-07 222312" src="https://github.com/user-attachments/assets/842ac2b4-05f6-428e-a38a-b24f64b25843" />
<img width="1919" height="1079" alt="Screenshot 2026-03-07 220933" src="https://github.com/user-attachments/assets/27fd464d-8481-479d-9bbb-ddc4eba61fc6" />



## High-level workflow

1. Outbreak is created in the system with location, severity, and affected counts.
2. Admin selects an outbreak and triggers "Allocate Vehicle".
3. Backend evaluates candidate vehicles, calls Mapbox Directions, chooses the best ETA route, and creates:
   - a vehicle assignment
   - a navigation route record (GeoJSON LineString + alternatives)
4. Van dashboard shows pending assignments; the team accepts the assignment and navigates using the active route.
5. Van logs treatment activity and consumption (medicine and equipment usage).
6. Backend records the log, updates central resource availability, and pushes realtime events:
   - vehicle-scoped events for the van UI
   - global events for the doctor UI
7. Doctor dashboard reflects updated resource availability and live treatment metrics without manual refresh.

## Architecture overview

- Backend: FastAPI service exposing REST + WebSockets
  - Supabase Postgres is used as the primary data store (accessed via Supabase REST)
  - Mapbox Directions API is used for traffic-aware route selection
  - WebSockets provide vehicle-scoped and global broadcast channels
- Frontend (single Vite app): admin, doctor, and van dashboards in one UI
  - Supabase Auth is used for login and role routing
  - Mapbox GL JS is used for map rendering and route visualization

## Repository layout

```
rural-health-admin/
  README.md
  frontend/                      # Main Vite app (admin + doctor + van dashboards)
  OUTBREAK_SENTINAL/
    backend/                     # FastAPI backend (main backend used for the project)
    supabase/migrations/         # SQL migrations used to create schema
    DOCTORE_DASH/                # Standalone doctor dashboard (optional)
    MOBILEVAN_DASH/              # Standalone van dashboard (optional)
  backend/                       # Legacy mock backend used during early UI prototyping (optional)
```

## Prerequisites

- Node.js 18+ (for the frontend)
- Python 3.11+ (for the FastAPI backend)
- A Supabase project (database + auth)
- A Mapbox account and access tokens

## Environment variables

Do not commit real secrets. Copy the example files and fill in values locally.

### Frontend (Vite app)

File: `frontend/.env` (template: `frontend/.env.example`)

- `VITE_API_BASE_URL` (example: `http://localhost:8000`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_PUBLIC_TOKEN`

### Backend (FastAPI)

File: `OUTBREAK_SENTINAL/backend/.env` (template: `OUTBREAK_SENTINAL/backend/.env.example`)

- `SUPABASE_PROJECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for local development)
- `SUPABASE_ANON_KEY` (optional fallback)
- `MAPBOX_SECRET_TOKEN`
- `MAPBOX_PUBLIC_TOKEN` (optional)
- `CORS_ALLOW_ORIGINS` (comma-separated)

## Local development

### 1. Start the backend

```bash
cd OUTBREAK_SENTINAL/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Supabase schema

Schema and seed logic are provided as SQL migrations under:

`OUTBREAK_SENTINAL/supabase/migrations/`

Apply these using the Supabase SQL editor (or Supabase CLI if you prefer).

## Realtime channels

The backend exposes two WebSocket channels:

- `ws://localhost:8000/ws/vehicle/{vehicle_id}`: vehicle-scoped events (location, routing, stock)
- `ws://localhost:8000/ws/global`: global events used by the doctor dashboard (resources and live metrics)

## Key API endpoints (backend)

- Health
  - `GET /health`
- Outbreaks
  - `GET /outbreaks`
  - `POST /outbreaks`
- Vehicles
  - `GET /vehicles/`
  - `POST /vehicles/register`
  - `PATCH /vehicles/update-location`
  - `GET /vehicles/{vehicle_id}`
- Assignments
  - `POST /vehicle/assignments` (admin allocation)
  - `GET /vehicle/assignments/{vehicle_id}/detailed`
  - `POST /vehicle/assignment/accept`
  - `POST /vehicle/assignment/reject`
- Navigation
  - `GET /navigation/active-route/{vehicle_id}`
  - `POST /navigation/generate-route`
- Stock and resources
  - `POST /vehicle/stock/update`
  - `GET /vehicle/stock/{vehicle_id}`
  - `GET /resources/medicines`
  - `GET /resources/equipment`
  - `GET /resources/staff`
  - `GET /treatment/live-category-stats`
  - `GET /treatment/live-recovery-trend`

## Security notes

- Never commit `.env` files. This repository includes `.env.example` templates and `.gitignore` rules to prevent accidental commits.
- The Supabase service role key provides elevated access. Treat it as a secret and rotate it if it is ever exposed.
- The Mapbox public token is intended for client-side use, but should still be managed via environment variables.

## Credits

Built during KL University "HackwithAI" 24-hour hackathon by team RAGNAROK.

