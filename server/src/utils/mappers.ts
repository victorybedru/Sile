/**
 * Sile Database <-> Frontend Domain Mappers
 * File: server/src/utils/mappers.ts
 * 
 * Safely converts between PostgreSQL snake_case rows and TypeScript camelCase models.
 * Preserves affected_neighborhoods as string, enforces validation without silent fallback,
 * formats timestamps honestly without fabricating synchronization metadata, and
 * guarantees authoritative publisher identity.
 */

import crypto from 'crypto';
import {
  ActivityLog,
  Announcement,
  CreateAnnouncementInput,
  DbActivityLogRow,
  DbAnnouncementRow,
  DbReportRow,
  Report,
} from '../types/index.js';

/**
 * Authoritative default publisher identity used for official coordinator announcements.
 * Not taken from untrusted client requests.
 */
export const DEFAULT_PUBLISHER_NAME = 'Addis Ababa District Coordination Desk';

/**
 * Maps a database activity log row to the frontend ActivityLog model
 */
export function mapDbActivityLogToApi(row: DbActivityLogRow): ActivityLog {
  return {
    id: row.id,
    reportId: row.report_id,
    timestamp: row.timestamp,
    action: row.action,
    details: row.details,
    actor: row.actor,
  };
}

/**
 * Maps a database report row and its associated activity log rows
 * to the frontend Report model.
 * 
 * Synchronization Metadata Note:
 * The database persists reports and their authoritative domain data.
 * Client-specific sync metadata (`syncAttempts`, `lastSyncAttemptAt`, `syncErrorMessage`)
 * belong to the local device's offline IndexedDB queue managed by `syncService.ts`.
 * When fetched from the server database, the report is by definition stored/synchronized,
 * so `syncStatus` is `'Synchronized'` and `syncAttempts` is `0`. We honestly omit
 * `lastSyncAttemptAt` and `syncErrorMessage` (set as undefined) rather than fabricating
 * timestamps from `updated_at`.
 */
export function mapDbReportToApi(
  reportRow: DbReportRow,
  logRows: DbActivityLogRow[] = []
): Report {
  const history: ActivityLog[] = logRows
    .map(mapDbActivityLogToApi)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    id: reportRow.id,
    category: reportRow.category,
    subCity: reportRow.sub_city,
    specificLocation: reportRow.specific_location,
    description: reportRow.description,
    priority: reportRow.priority,
    status: reportRow.status,
    syncStatus: 'Synchronized',
    syncAttempts: 0,
    lastSyncAttemptAt: undefined, // Honest: Database does not store device-local sync retry timestamps
    syncErrorMessage: undefined,
    assignedTo: reportRow.assigned_to ?? undefined,
    coordinatorNotes: reportRow.coordinator_notes ?? undefined,
    createdAt: reportRow.client_created_at || reportRow.created_at,
    updatedAt: reportRow.client_updated_at || reportRow.updated_at,
    history,
  };
}

/**
 * Maps an incoming frontend Report into the payload expected by
 * the PostgreSQL submit_report_atomic(p_report JSONB) function.
 * 
 * Strictly validates that specificLocation is present. Missing or invalid
 * specificLocation is rejected with an Error rather than silently replaced with subCity.
 */
export function mapApiReportToRpcPayload(report: Partial<Report>): Record<string, unknown> {
  const specificLocation = report.specificLocation?.trim();

  if (!specificLocation) {
    throw new Error('Validation Error: specificLocation is required and cannot be empty.');
  }

  return {
    id: report.id?.trim(),
    category: report.category,
    subCity: report.subCity,
    specificLocation,
    description: report.description?.trim(),
    priority: report.priority || 'Medium',
    status: report.status || 'Submitted',
    createdAt: report.createdAt || new Date().toISOString(),
    updatedAt: report.updatedAt || report.createdAt || new Date().toISOString(),
  };
}

/**
 * Maps a database announcement row to the frontend Announcement model.
 * Preserves affected_neighborhoods directly as a string matching the frontend type.
 */
export function mapDbAnnouncementToApi(row: DbAnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subCity: row.sub_city,
    affectedNeighborhoods: row.affected_neighborhoods ?? undefined,
    description: row.description,
    isPlanned: row.is_planned,
    startDate: row.start_date ?? undefined,
    expectedEndDate: row.expected_end_date ?? undefined,
    publishedAt: row.published_at,
    isPublished: row.is_published,
    isSampleData: row.is_sample_data,
    publisherName: row.publisher_name,
  };
}

/**
 * Options for controlling trusted server-side fields when creating announcements.
 */
export interface AnnouncementMappingOptions {
  trustedPublisher?: string;
  isSampleData?: boolean;
}

/**
 * Maps an incoming frontend announcement input to PostgreSQL snake_case columns.
 * 
 * ID Generation: Generates an ID using crypto.randomUUID() compatible with TEXT PRIMARY KEY.
 * Sample Data Default: Normal coordinator announcements default to is_sample_data = false.
 * Publisher Identity: Enforces trusted backend publisher name rather than trusting arbitrary client input.
 */
export function mapApiAnnouncementToDb(
  input: CreateAnnouncementInput & { id?: string },
  options?: AnnouncementMappingOptions
): Partial<DbAnnouncementRow> {
  const now = new Date().toISOString();
  const publisher = options?.trustedPublisher?.trim() || DEFAULT_PUBLISHER_NAME;
  const isSampleData = options?.isSampleData ?? false; // Sensible default: coordinator notices are real, not sample data

  return {
    id: input.id?.trim() || `ann-${crypto.randomUUID()}`,
    title: input.title.trim(),
    category: input.category,
    sub_city: input.subCity,
    affected_neighborhoods: input.affectedNeighborhoods?.trim() || null,
    description: input.description.trim(),
    is_planned: Boolean(input.isPlanned),
    start_date: input.startDate || null,
    expected_end_date: input.expectedEndDate || null,
    published_at: now,
    is_published: input.isPublished ?? true,
    is_sample_data: isSampleData,
    publisher_name: publisher, // Authoritatively set by backend context
  };
}
