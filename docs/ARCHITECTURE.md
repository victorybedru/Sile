# Sile Architecture

## Frontend
The frontend is built with React and TypeScript using Vite.
It provides the resident interface, report submission,
announcement viewing and coordinator workflows.

## Backend
The backend uses Node.js, Express and TypeScript.
It exposes REST API endpoints under /api/v1.

## Database
Supabase PostgreSQL provides persistent storage for reports,
announcements and related application data.

## Offline Support
IndexedDB stores reports locally when connectivity is unavailable.
Pending reports are synchronized with the backend when possible.

## Communication
The frontend communicates with the backend through HTTP requests.
The backend handles validation, business logic and database operations.
