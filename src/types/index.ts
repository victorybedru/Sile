/**
 * Core domain types and state models for Sile
 * Community Service Information & Reporting Platform (Addis Ababa, Ethiopia)
 */

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

export interface ActivityLog {
  id: string;
  reportId: string;
  timestamp: string; // ISO date string
  action: string;
  details: string;
  actor: 'Resident' | 'Coordinator' | 'System';
}

export interface Report {
  id: string; // Unique UUID created locally
  category: ServiceCategory;
  subCity: SubCity;
  specificLocation: string; // Street name, landmark or neighborhood (e.g., "Near Edna Mall, Ring Road")
  description: string;
  priority: Priority;
  status: ReportStatus;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt?: string;
  syncErrorMessage?: string;
  assignedTo?: string; // e.g. "Bole District Electrical Team"
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
  isPlanned: boolean; // Planned maintenance vs unplanned disruption
  startDate?: string;
  expectedEndDate?: string;
  publishedAt: string;
  isPublished: boolean;
  isSampleData: boolean; // Clearly marks demo announcements
  publisherName: string;
}

export type UserRole = 'resident' | 'coordinator';

// Status transition state machine rules
// Draft -> Submitted -> Assigned -> In Progress -> Resolved
// Or from any active state -> Rejected
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
