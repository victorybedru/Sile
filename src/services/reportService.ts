/**
 * Report Service for Sile
 * Handles report validation, creation, state transitions, and audit activity history.
 */

import { ActivityLog, Priority, Report, ReportStatus, ServiceCategory, SubCity, canTransitionStatus } from '../types';
import { localDB } from './db';

export interface CreateReportInput {
  category: ServiceCategory;
  subCity: SubCity;
  specificLocation: string;
  description: string;
  priority: Priority;
  saveAsDraft?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ReportService {
  /**
   * Validates user input before saving or submitting a report
   */
  validateReportInput(input: Partial<CreateReportInput>): ValidationResult {
    const errors: Record<string, string> = {};

    if (!input.category) {
      errors.category = 'Please choose a service category (Electricity, Water, Roads, or Other).';
    }

    if (!input.subCity) {
      errors.subCity = 'Please choose the affected sub-city in Addis Ababa.';
    }

    if (!input.description || input.description.trim().length === 0) {
      errors.description = 'Please describe the problem so crews know what is needed.';
    } else if (input.description.trim().length < 10) {
      errors.description = 'Please provide a bit more detail (at least 10 characters).';
    }

    if (!input.priority) {
      errors.priority = 'Please indicate the priority level (Low, Medium, or High).';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Generates a unique, collision-resistant ID for the report
   */
  generateReportId(): string {
    const prefix = 'sile';
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${randomPart}`;
  }

  /**
   * Creates and stores a new report locally in IndexedDB
   */
  async createReport(input: CreateReportInput): Promise<Report> {
    const validation = this.validateReportInput(input);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Invalid report details.');
    }

    const now = new Date().toISOString();
    const id = this.generateReportId();
    const initialStatus: ReportStatus = input.saveAsDraft ? 'Draft' : 'Submitted';

    const history: ActivityLog[] = [
      {
        id: `act-${Date.now()}-1`,
        reportId: id,
        timestamp: now,
        action: 'Report Created',
        details: `Report recorded locally on device. Specific area: ${input.specificLocation || input.subCity}.`,
        actor: 'Resident',
      },
    ];

    if (!input.saveAsDraft) {
      history.push({
        id: `act-${Date.now()}-2`,
        reportId: id,
        timestamp: now,
        action: 'Report Submitted',
        details: 'Report queued for coordinator dispatch and synchronization.',
        actor: 'Resident',
      });
    }

    const report: Report = {
      id,
      category: input.category,
      subCity: input.subCity,
      specificLocation: input.specificLocation ? input.specificLocation.trim() : input.subCity,
      description: input.description.trim(),
      priority: input.priority,
      status: initialStatus,
      syncStatus: 'Pending',
      syncAttempts: 0,
      createdAt: now,
      updatedAt: now,
      history,
    };

    await localDB.saveReport(report);
    return report;
  }

  /**
   * Transitions a report status following the strict state machine:
   * Draft -> Submitted -> Assigned -> In Progress -> Resolved (or Rejected)
   */
  async updateReportStatus(
    reportId: string,
    targetStatus: ReportStatus,
    note?: string,
    actor: 'Resident' | 'Coordinator' | 'System' = 'Coordinator'
  ): Promise<Report> {
    const report = await localDB.getReportById(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const check = canTransitionStatus(report.status, targetStatus);
    if (!check.allowed) {
      throw new Error(check.reason || 'Invalid status transition.');
    }

    const now = new Date().toISOString();
    const historyItem: ActivityLog = {
      id: `act-${Date.now()}`,
      reportId: report.id,
      timestamp: now,
      action: `Status Changed to ${targetStatus}`,
      details: note || `Status progressed from ${report.status} to ${targetStatus}.`,
      actor,
    };

    const updated: Report = {
      ...report,
      status: targetStatus,
      updatedAt: now,
      coordinatorNotes: note ? (report.coordinatorNotes ? `${report.coordinatorNotes}\n${note}` : note) : report.coordinatorNotes,
      history: [...report.history, historyItem],
    };

    await localDB.saveReport(updated);
    return updated;
  }

  /**
   * Assigns a report to a specific agency or team
   */
  async assignReport(reportId: string, assignedTo: string, note?: string): Promise<Report> {
    const report = await localDB.getReportById(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const now = new Date().toISOString();
    const newStatus: ReportStatus = report.status === 'Submitted' ? 'Assigned' : report.status;

    const historyItem: ActivityLog = {
      id: `act-${Date.now()}`,
      reportId: report.id,
      timestamp: now,
      action: 'Report Assigned',
      details: `Assigned to ${assignedTo}. ${note || ''}`.trim(),
      actor: 'Coordinator',
    };

    const updated: Report = {
      ...report,
      assignedTo,
      status: newStatus,
      updatedAt: now,
      history: [...report.history, historyItem],
    };

    await localDB.saveReport(updated);
    return updated;
  }

  /**
   * Appends an activity log item to a report
   */
  async addActivityLog(
    reportId: string,
    action: string,
    details: string,
    actor: 'Resident' | 'Coordinator' | 'System'
  ): Promise<Report> {
    const report = await localDB.getReportById(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const log: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      reportId,
      timestamp: new Date().toISOString(),
      action,
      details,
      actor,
    };

    const updated: Report = {
      ...report,
      updatedAt: new Date().toISOString(),
      history: [...report.history, log],
    };

    await localDB.saveReport(updated);
    return updated;
  }
}

export const reportService = new ReportService();
