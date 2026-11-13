/**
 * Report Service
 * File: server/src/services/reportService.ts
 * 
 * Manages report creation, offline sync idempotency, retrieval,
 * status transitions, and coordinator assignments using Supabase
 * and atomic PostgreSQL RPC functions.
 */

import { supabase } from '../config/supabase.js';
import {
  ALL_SUBCITIES,
  ActorRole,
  BatchSyncResult,
  DbActivityLogRow,
  DbReportRow,
  Report,
  ReportFilters,
  ReportStatus,
  canTransitionStatus,
} from '../types/index.js';
import { mapApiReportToRpcPayload, mapDbReportToApi } from '../utils/mappers.js';

export interface ReportSubmissionResult {
  report: Report;
  isDuplicateAck: boolean;
  serverTimestamp: string;
}

export class ReportService {
  /**
   * Submits a report to the database using the atomic submit_report_atomic RPC.
   * 
   * Idempotency Guarantee:
   * - If the report ID already exists with matching content, acknowledges the report
   *   safely without overwriting any coordinator notes or status progression.
   * - If the report ID exists with conflicting domain content, rejects with an error.
   * - Authoritative activity logs are stamped by PostgreSQL (actor: Resident, timestamp: NOW()).
   */
  async submitReport(report: Report): Promise<ReportSubmissionResult> {
    if (!report.id || !report.id.trim()) {
      throw new Error('Validation Error: Report ID cannot be empty.');
    }

    if (!report.category || !['Electricity', 'Water', 'Roads', 'Other'].includes(report.category)) {
      throw new Error(`Validation Error: Invalid category: "${report.category}". Must be Electricity, Water, Roads, or Other.`);
    }

    if (!report.subCity || !ALL_SUBCITIES.includes(report.subCity)) {
      throw new Error(`Validation Error: Invalid sub-city: "${report.subCity}".`);
    }

    const trimmedLocation = report.specificLocation?.trim();
    if (!trimmedLocation) {
      throw new Error('Validation Error: specificLocation is required and cannot be empty.');
    }

    const trimmedDesc = report.description?.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      throw new Error('Validation Error: description must provide clear details (at least 10 characters).');
    }

    if (!report.priority || !['Low', 'Medium', 'High'].includes(report.priority)) {
      throw new Error(`Validation Error: Invalid priority: "${report.priority}".`);
    }

    const initialStatus = report.status || 'Submitted';
    if (!['Draft', 'Submitted'].includes(initialStatus)) {
      throw new Error(`Validation Error: Newly submitted reports cannot start in "${initialStatus}" status.`);
    }

    const payload = mapApiReportToRpcPayload(report);

    // Call the concurrency-safe atomic RPC function in PostgreSQL
    const { data, error } = await supabase.rpc('submit_report_atomic', {
      p_report: payload,
    });

    if (error) {
      throw new Error(`Report submission rejected: ${error.message}`);
    }

    const result = data as {
      success: boolean;
      isDuplicateAck: boolean;
      report: DbReportRow;
    };

    if (!result || !result.success) {
      throw new Error('Database rejected report submission.');
    }

    // Retrieve the fully populated report with its authoritative activity logs
    const persisted = await this.getReportById(report.id.trim());
    if (!persisted) {
      throw new Error('Failed to verify report persistence after submission.');
    }

    const serverTimestamp = new Date().toISOString();

    return {
      report: persisted,
      isDuplicateAck: Boolean(result.isDuplicateAck),
      serverTimestamp,
    };
  }

  /**
   * Batch synchronizes reports transmitted from client-side offline queues.
   * Processes each report idempotently, accumulating successes and failures.
   */
  async batchSyncReports(reports: Report[]): Promise<BatchSyncResult> {
    const successfulIds: string[] = [];
    const failedIds: Array<{ id: string; error: string }> = [];

    for (const report of reports) {
      try {
        await this.submitReport(report);
        successfulIds.push(report.id);
      } catch (err: unknown) {
        failedIds.push({
          id: report.id,
          error: err instanceof Error ? err.message : 'Unknown synchronization error',
        });
      }
    }

    return { successfulIds, failedIds };
  }

  /**
   * Retrieves all reports matching optional criteria, joined with their activity logs.
   */
  async getReports(filters?: ReportFilters): Promise<Report[]> {
    let query = supabase
      .from('reports')
      .select('*, report_activity_logs(*)')
      .order('created_at', { ascending: false });

    if (filters?.subCity) {
      query = query.eq('sub_city', filters.subCity);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve reports: ${error.message}`);
    }

    const rows = (data as Array<DbReportRow & { report_activity_logs?: DbActivityLogRow[] }>) || [];

    return rows.map((row) => {
      const logs = row.report_activity_logs || [];
      return mapDbReportToApi(row, logs);
    });
  }

  /**
   * Retrieves a single report by ID along with its full activity log history.
   */
  async getReportById(id: string): Promise<Report | null> {
    const trimmedId = id.trim();
    if (!trimmedId) return null;

    const { data, error } = await supabase
      .from('reports')
      .select('*, report_activity_logs(*)')
      .eq('id', trimmedId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve report ${trimmedId}: ${error.message}`);
    }

    if (!data) return null;

    const row = data as DbReportRow & { report_activity_logs?: DbActivityLogRow[] };
    return mapDbReportToApi(row, row.report_activity_logs || []);
  }

  /**
   * Updates report status using update_report_status_atomic.
   * Enforces the state machine: Draft -> Submitted -> Assigned -> In Progress -> Resolved (or Rejected).
   */
  async updateReportStatus(
    reportId: string,
    targetStatus: ReportStatus,
    note?: string,
    actor: ActorRole = 'Coordinator'
  ): Promise<Report> {
    const trimmedId = reportId.trim();
    if (!trimmedId) {
      throw new Error('Report ID cannot be empty.');
    }

    if (!['Coordinator', 'System'].includes(actor)) {
      throw new Error(`Unauthorized actor: "${actor}". Only Coordinator or System may update report status.`);
    }

    // Verify existing report and validate transition rules upfront
    const existing = await this.getReportById(trimmedId);
    if (!existing) {
      throw new Error(`Report not found with ID: ${trimmedId}`);
    }

    const check = canTransitionStatus(existing.status, targetStatus);
    if (!check.allowed) {
      throw new Error(check.reason || `Invalid status transition from "${existing.status}" to "${targetStatus}".`);
    }

    // Invoke atomic status update RPC in Supabase
    const { error } = await supabase.rpc('update_report_status_atomic', {
      p_report_id: trimmedId,
      p_target_status: targetStatus,
      p_note: note?.trim() || null,
      p_actor: actor,
    });

    if (error) {
      throw new Error(`Failed to update report status: ${error.message}`);
    }

    const updated = await this.getReportById(trimmedId);
    if (!updated) {
      throw new Error('Failed to retrieve updated report after status transition.');
    }

    return updated;
  }

  /**
   * Assigns a report to a dispatch team or agency using assign_report_atomic.
   * Automatically advances 'Submitted' reports to 'Assigned'.
   */
  async assignReport(
    reportId: string,
    assignedTo: string,
    note?: string,
    actor: ActorRole = 'Coordinator'
  ): Promise<Report> {
    const trimmedId = reportId.trim();
    const trimmedAssignee = assignedTo.trim();

    if (!trimmedId) {
      throw new Error('Report ID cannot be empty.');
    }
    if (!trimmedAssignee) {
      throw new Error('Assigned dispatch team or agency cannot be empty.');
    }
    if (!['Coordinator', 'System'].includes(actor)) {
      throw new Error(`Unauthorized actor: "${actor}". Only Coordinator or System may assign reports.`);
    }

    // Verify current status: Draft and Terminal reports cannot be assigned
    const existing = await this.getReportById(trimmedId);
    if (!existing) {
      throw new Error(`Report not found with ID: ${trimmedId}`);
    }

    if (existing.status === 'Draft') {
      throw new Error('Cannot assign a report in "Draft" status. Reports must be submitted before they can be assigned.');
    }

    if (['Resolved', 'Rejected'].includes(existing.status)) {
      throw new Error(`Cannot assign a report in terminal status "${existing.status}".`);
    }

    // Invoke atomic assignment RPC in Supabase
    const { error } = await supabase.rpc('assign_report_atomic', {
      p_report_id: trimmedId,
      p_assigned_to: trimmedAssignee,
      p_note: note?.trim() || null,
      p_actor: actor,
    });

    if (error) {
      throw new Error(`Failed to assign report: ${error.message}`);
    }

    const updated = await this.getReportById(trimmedId);
    if (!updated) {
      throw new Error('Failed to retrieve updated report after assignment.');
    }

    return updated;
  }
}

export const reportService = new ReportService();
