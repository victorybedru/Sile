# Sile

Sile is a community service information and infrastructure-reporting prototype for Addis Ababa, Ethiopia. Residents can view service announcements, filter by area, submit reports, and track their status. Coordinators can review reports, assign response teams, update statuses, and publish announcements.

> **Prototype notice:** announcements and reports are demonstration data unless entered through the coordinator workflow. Sile is not connected to utility-provider systems or government dispatch systems. Coordinator role switching is simulated with an HTTP header; it is not real authentication.

## Features

- Resident-facing electricity, water, and road announcements.
- Report submission with client-side validation.
- IndexedDB persistence for reports and cached announcements.
- Offline report queue with retry and server-confirmed synchronization.
- Idempotent report submission using a stable client-generated report ID.
- Coordinator report assignment and status workflow.
- Activity history for report changes.
- Coordinator announcement creation, editing, publishing, and unpublishing.

## Architecture

- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **Local persistence:** IndexedDB in the browser.
- **Backend:** Node.js, Express, TypeScript.
- **Server database:** Supabase PostgreSQL.
- **API prefix:** `/api/v1`.

The frontend saves reports locally before attempting network synchronization. When online, it sends the same report ID to the backend. The backend uses the `submit_report_atomic` PostgreSQL function to prevent duplicate creation. A report is marked `Synchronized` locally only after the API confirms success. Failed reports remain in IndexedDB for retry. Draft reports remain local until submitted.

Coordinator status changes and assignments are sent to the backend first. The database functions enforce allowed state transitions and write activity history. The browser then updates its local copy after a successful response.

Announcements fetched from the backend are cached in IndexedDB. Previously cached announcements and sample announcements remain available when the backend cannot be reached. Sample records are marked `isSampleData`; coordinator-created announcements are stored as non-sample records.

## Project structure

```text
Sile/
  src/                 React frontend and IndexedDB services
  server/              Express API and Supabase integration
    src/               Controllers, routes, services, middleware
    supabase/           schema.sql and seed.sql
```

## Requirements

- Node.js 20 or newer recommended.
- npm.
- A Supabase project for persistent server-side data.

## Setup

### 1. Frontend

From the project root:

```bash
npm install
```

Create `.env.local` or `.env` in the project root with:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Vite runs at `http://localhost:3000`.

### 2. Supabase database

In the Supabase SQL Editor, run these files in order:

1. `server/supabase/schema.sql`
2. `server/supabase/seed.sql`

The schema creates the reports, activity-log, and announcements tables plus the atomic report submission, status transition, and assignment functions. Seed records are sample data.

### 3. Backend

In a second terminal:

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and fill in the actual values from Supabase Project Settings → API:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NODE_ENV=development
```

**Never put the service-role key in frontend environment variables or commit it.** The backend can start without Supabase credentials so `/health` remains available, but database-backed endpoints will not work until credentials are configured.

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:5000`; health is available at `http://localhost:5000/health`.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API and database health |
| POST | `/api/v1/reports` | Submit one report |
| POST | `/api/v1/reports/sync` | Batch synchronization |
| GET | `/api/v1/reports` | List reports |
| GET | `/api/v1/reports/:id` | Retrieve a report |
| GET | `/api/v1/reports/:id/history` | Retrieve report history |
| PATCH | `/api/v1/reports/:id/status` | Update report status (coordinator) |
| PATCH | `/api/v1/reports/:id/assign` | Assign a report (coordinator) |
| GET | `/api/v1/announcements` | List published announcements |
| GET | `/api/v1/announcements/:id` | Retrieve a published announcement |
| GET/POST | `/api/v1/coordinator/announcements` | List/create announcements (coordinator) |
| PATCH | `/api/v1/coordinator/announcements/:id` | Edit announcement (coordinator) |
| PATCH | `/api/v1/coordinator/announcements/:id/publish` | Publish/unpublish (coordinator) |

The prototype frontend sends `X-User-Role: resident` or `X-User-Role: coordinator`. This is only a demonstration guard and must be replaced with verified authentication before production use.

## Design decisions and assumptions

- **Duplicate reports:** each report receives a stable client-generated ID. Retrying the same ID is idempotent; a conflicting payload with the same ID is rejected.
- **Interrupted sync:** reports stay in IndexedDB until the server confirms persistence. Failed items retain their retry state and can be sent again.
- **Local/server conflict:** the server is authoritative for coordinator status, assignment, and history. Local sync metadata remains device-specific.
- **Editing submitted reports:** the current prototype does not provide resident editing after submission.
- **Reopening resolved reports:** resolved and rejected statuses are terminal in the current state machine.
- **Invalid input:** frontend and backend validation reject missing or malformed required fields.
- **History:** report creation, status transitions, and assignments are recorded in the server activity log; local sync attempts are stored on the device.
- **Visibility:** public announcement retrieval returns published notices only. Coordinator routes can retrieve unpublished notices. Report listing is available to the prototype roles and is not suitable for production without access controls.

## Tests

Backend domain tests:

```bash
cd server
npm test
```

TypeScript builds:

```bash
# project root
npm run lint
npm run build

# backend
cd server
npm run build
```

## Manual QA checklist

- [ ] Start Supabase, backend, and frontend.
- [ ] Confirm `/health` reports database connected.
- [ ] Submit a valid resident report and confirm it appears in Supabase.
- [ ] Retry the same report ID and confirm no duplicate row is created.
- [ ] Submit while simulated offline; confirm the report remains in IndexedDB.
- [ ] Restore connectivity and confirm the report becomes synchronized only after server acknowledgement.
- [ ] Switch to coordinator and confirm server reports load.
- [ ] Assign a submitted report and advance it through valid statuses.
- [ ] Confirm report activity history is retained.
- [ ] Create, edit, publish, and unpublish an announcement.
- [ ] Confirm residents only see published announcements.
- [ ] Refresh the browser and confirm local data remains available.

## Known limitations

- Authentication and coordinator authorization are simulated, not secure authentication.
- No direct integration exists with Addis Ababa utility providers or government dispatch systems.
- Residents cannot edit reports after submission in this prototype.
- Resolved and rejected reports cannot be reopened through the current state machine.
- Deployment is optional and is not included in the local setup instructions.
- Real Supabase integration checks require valid project credentials and the SQL schema to be applied.

## Development disclosure

Google Antigravity was used during initial application development and code drafting. Claude was used to inspect and implement part of the backend. ChatGPT was used to review the existing code, help implement frontend/backend integration, debug issues, and prepare tests and documentation. Suggestions were reviewed and modified during implementation; builds and local API checks were run where possible. Cursor was considered but was not used to produce submitted code. The developer remains responsible for understanding, testing, and verifying the final application.

Approximate development time: to be completed by the project author before submission.
