/**
 * Sile Backend Types & Domain State Models
 * File: server/src/types/index.ts
 * 
 * Matches frontend domain models from src/types/index.ts and database rows
 * defined in server/supabase/schema.sql.
 * 
 * ============================================================================
 * PROTOTYPE SECURITY & ROLE BOUNDARY NOTICE:
 * This software is a graduation prototype. Role switching (Resident vs. Coordinator)
 * is controlled via UI demonstration toggles and request headers.
 * 
 * - Client-supplied role markers are NOT cryptographic authentication.
 * - This must NOT be mistaken for production authentication.
 * - In production, this must be replaced with Supabase Auth (JWT bearer tokens),
 *   verified coordinator logins (email/password or SSO), and database Row Level
 *   Security (RLS) policies checking auth.uid().
 * ============================================================================
 */

// ==============================================================================
// 1. DOMAIN ENUMS & UNION TYPES (Matches Frontend Exactly)
// ==============================================================================

export type SubCity =
  | 'Bole'
  | 'Kirkos'
  | 'Arada'
  | 'Yeka'
  | 'Lideta'
  | 'Gulele'
  | 'Kolfe Keranio'
  | 'Nifas Silk-Lafto'
  | 'Akaki-Kality'
  | 'Addis Ketema'
  | 'Lemi Kura';

export const ALL_SUBCITIES: SubCity[] = [
  'Bole',
  'Kirkos',
  'Arada',
  'Yeka',
  'Lideta',
  'Gulele',
  'Kolfe Keranio',
  'Nifas Silk-Lafto',
  'Akaki-Kality',
  'Addis Ketema',
  'Lemi Kura',
];

export type ServiceCategory = 'Electricity' | 'Water' | 'Roads' | 'Other';

export type Priority = 'Low' | 'Medium' | 'High';

export type ReportStatus =
  | 'Draft'
  | 'Submitted'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export type SyncStatus = 'Pending' | 'Synchronized' | 'Failed';

export type ActorRole = 'Resident' | 'Coordinator' | 'System';

export type UserRole = 'resident' | 'coordinator';

// ==============================================================================
// 2. DOMAIN INTERFACES (Matches Frontend Report, Announcement, ActivityLog)
// ==============================================================================

export interface ActivityLog {
  id: string;
  reportId: string;
  timestamp: string; // ISO date string
  action: string;
  details: string;
  actor: ActorRole;
}

export interface Report {
  id: string; // Unique collision-resistant ID created on device
  category: ServiceCategory;
  subCity: SubCity;
  specificLocation: string;
  description: string;
  priority: Priority;
  status: ReportStatus;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt?: string;
  syncErrorMessage?: string;
  assignedTo?: string;
  coordinatorNotes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  history: ActivityLog[];
}

export interface Announcement {
  id: string;
  title: string;
  category: 'Electricity' | 'Water' | 'Roads';
  subCity: SubCity | 'All Areas';
  affectedNeighborhoods?: string;
  description: string;
  isPlanned: boolean;
  startDate?: string;
  expectedEndDate?: string;
  publishedAt: string;
  isPublished: boolean;
  isSampleData: boolean;
  publisherName: string;
}

// ==============================================================================
// 3. DATABASE ROW TYPES (Matches PostgreSQL schema.sql)
// ==============================================================================

export interface DbReportRow {
  id: string;
  category: ServiceCategory;
  sub_city: SubCity;
  specific_location: string;
  description: string;
  priority: Priority;
  status: ReportStatus;
  assigned_to: string | null;
  coordinator_notes: string | null;
  client_created_at: string;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbActivityLogRow {
  id: string;
  report_id: string;
  action: string;
  details: string;
  actor: ActorRole;
  timestamp: string;
  created_at: string;
}

export interface DbAnnouncementRow {
  id: string;
  title: string;
  category: 'Electricity' | 'Water' | 'Roads';
  sub_city: SubCity | 'All Areas';
  affected_neighborhoods: string | null;
  description: string;
  is_planned: boolean;
  start_date: string | null;
  expected_end_date: string | null;
  published_at: string;
  is_published: boolean;
  is_sample_data: boolean;
  publisher_name: string;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// 4. API REQUEST & RESPONSE TYPES
// Notice: Privileged inputs do not accept actor identity from the frontend payload.
// Actor identity is determined and validated authoritatively by the backend.
// ==============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  serverTimestamp: string;
  isDuplicateAck?: boolean;
}

export interface BatchSyncResult {
  successfulIds: string[];
  failedIds: Array<{ id: string; error: string }>;
}

export interface UpdateReportStatusInput {
  status: ReportStatus;
  note?: string;
}

export interface AssignReportInput {
  assignedTo: string;
  note?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  category: 'Electricity' | 'Water' | 'Roads';
  subCity: SubCity | 'All Areas';
  affectedNeighborhoods?: string;
  description: string;
  isPlanned: boolean;
  startDate?: string;
  expectedEndDate?: string;
  isPublished?: boolean;
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  isPublished?: boolean;
}

export interface ReportFilters {
  subCity?: SubCity;
  category?: ServiceCategory;
  status?: ReportStatus;
  priority?: Priority;
}

export interface AnnouncementFilters {
  subCity?: SubCity | 'All Areas';
  category?: 'Electricity' | 'Water' | 'Roads';
  isPublished?: boolean;
}

// ==============================================================================
// 5. STATUS TRANSITION STATE MACHINE (Authoritative State Machine)
// ==============================================================================

export const VALID_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  Draft: ['Submitted', 'Rejected'],
  Submitted: ['Assigned', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: [], // Terminal state
  Rejected: [], // Terminal state
};

export function canTransitionStatus(
  current: ReportStatus,
  target: ReportStatus
): { allowed: boolean; reason?: string } {
  if (current === target) {
    return { allowed: false, reason: 'Report is already in this status.' };
  }
  const allowedNext = VALID_STATUS_TRANSITIONS[current] || [];
  if (allowedNext.includes(target)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Invalid status transition: A report cannot move directly from "${current}" to "${target}". Workflow requires: Draft → Submitted → Assigned → In Progress → Resolved.`,
  };
}
