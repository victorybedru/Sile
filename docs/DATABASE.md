# Database Design

Sile uses Supabase PostgreSQL for persistent application data.

## Main Data Entities

- Reports: Stores submitted community service issues.
- Announcements: Stores public service updates.
- Report History: Records changes made to report status.
- Coordinators: Represents users responsible for handling reports.

## Report Information

A report includes:
- Unique report identifier
- Category and description
- Location information
- Priority
- Current status
- Submission timestamp

## Data Persistence

Reports are stored remotely in PostgreSQL and locally in IndexedDB
to support offline usage.

## Data Integrity

The backend validates report data and controls valid status transitions.
