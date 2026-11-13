/**
 * Activity History Service
 * File: server/src/services/activityHistoryService.ts
 * 
 * Manages chronological audit history for community service reports.
 * Matches the report_activity_logs table in Supabase.
 */

import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { ActivityLog, ActorRole, DbActivityLogRow } from '../types/index.js';
import { mapDbActivityLogToApi } from '../utils/mappers.js';

export class ActivityHistoryService {
  /**
   * Retrieves all activity log entries for a given report, ordered chronologically.
   */
  async getLogsByReportId(reportId: string): Promise<ActivityLog[]> {
    const trimmedId = reportId.trim();
    if (!trimmedId) {
      throw new Error('Report ID cannot be empty when querying activity logs.');
    }

    const { data, error } = await supabase
      .from('report_activity_logs')
      .select('*')
      .eq('report_id', trimmedId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to retrieve activity history: ${error.message}`);
    }

    const rows = (data as DbActivityLogRow[]) || [];
    return rows.map(mapDbActivityLogToApi);
  }

  /**
   * Authoritatively records an activity log entry for a report.
   * Enforces valid actor values ('Resident' | 'Coordinator' | 'System') and server timestamps.
   */
  async recordLog(
    reportId: string,
    action: string,
    details: string,
    actor: ActorRole = 'System'
  ): Promise<ActivityLog> {
    const trimmedReportId = reportId.trim();
    const trimmedAction = action.trim();
    const trimmedDetails = details.trim();

    if (!trimmedReportId) {
      throw new Error('Report ID is required to record an activity log.');
    }
    if (!trimmedAction) {
      throw new Error('Action description is required to record an activity log.');
    }
    if (!['Resident', 'Coordinator', 'System'].includes(actor)) {
      throw new Error(`Invalid actor: "${actor}". Must be Resident, Coordinator, or System.`);
    }

    const now = new Date().toISOString();
    const newId = `act-${crypto.randomUUID()}`;

    const newLogRow: DbActivityLogRow = {
      id: newId,
      report_id: trimmedReportId,
      action: trimmedAction,
      details: trimmedDetails,
      actor,
      timestamp: now,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('report_activity_logs')
      .insert(newLogRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record activity log: ${error.message}`);
    }

    return mapDbActivityLogToApi(data as DbActivityLogRow);
  }
}

export const activityHistoryService = new ActivityHistoryService();
