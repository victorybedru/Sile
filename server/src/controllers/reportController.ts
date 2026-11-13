/**
 * Report Controller
 * File: server/src/controllers/reportController.ts
 * 
 * Handles incoming HTTP requests for report submission, offline queue synchronization,
 * filtering, single retrieval, state transitions, dispatch assignments, and audit history.
 */

import { NextFunction, Request, Response } from 'express';
import { activityHistoryService } from '../services/activityHistoryService.js';
import { reportService } from '../services/reportService.js';
import { Priority, Report, ReportFilters, ReportStatus, ServiceCategory, SubCity } from '../types/index.js';

export class ReportController {
  /**
   * POST /api/v1/reports
   * Submits a report. Idempotent: returns 201 for new reports, 200 for duplicate acknowledgments.
   */
  async submitReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reportData: Report = req.body;

      if (!reportData || typeof reportData !== 'object') {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Request body must be a valid report JSON object.' },
        });
        return;
      }

      const result = await reportService.submitReport(reportData);

      const statusCode = result.isDuplicateAck ? 200 : 201;

      res.status(statusCode).json({
        success: true,
        data: result.report,
        isDuplicateAck: result.isDuplicateAck,
        serverTimestamp: result.serverTimestamp,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/reports/sync (and /api/v1/reports/batch-sync)
   * Batch synchronizes reports transmitted from client offline storage.
   */
  async batchSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports: Report[] = Array.isArray(req.body)
        ? req.body
        : Array.isArray(req.body?.reports)
        ? req.body.reports
        : [];

      if (!Array.isArray(reports) || reports.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Request body must contain a non-empty "reports" array.' },
        });
        return;
      }

      if (reports.length > 100) {
        res.status(400).json({ success: false, error: { message: 'A synchronization batch cannot contain more than 100 reports.' } });
        return;
      }
      if (reports.some((item) => !item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim())) {
        res.status(400).json({ success: false, error: { message: 'Every batch report must be an object with a non-empty string id.' } });
        return;
      }
      const result = await reportService.batchSyncReports(reports);

      res.status(200).json({
        success: true,
        data: result,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports
   * Retrieves reports matching optional filters.
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ReportFilters = {};

      if (typeof req.query.subCity === 'string' && req.query.subCity !== 'All') {
        filters.subCity = req.query.subCity as SubCity;
      }
      if (typeof req.query.category === 'string' && req.query.category !== 'All') {
        filters.category = req.query.category as ServiceCategory;
      }
      if (typeof req.query.status === 'string' && req.query.status !== 'All') {
        filters.status = req.query.status as ReportStatus;
      }
      if (typeof req.query.priority === 'string' && req.query.priority !== 'All') {
        filters.priority = req.query.priority as Priority;
      }

      if (filters.subCity && !['Bole','Kirkos','Arada','Yeka','Lideta','Gulele','Kolfe Keranio','Nifas Silk-Lafto','Akaki-Kality','Addis Ketema','Lemi Kura'].includes(filters.subCity)) {
        res.status(400).json({ success: false, error: { message: 'Validation Error: Invalid sub-city filter.' } }); return;
      }
      if (filters.category && !['Electricity','Water','Roads','Other'].includes(filters.category)) {
        res.status(400).json({ success: false, error: { message: 'Validation Error: Invalid category filter.' } }); return;
      }
      if (filters.status && !['Draft','Submitted','Assigned','In Progress','Resolved','Rejected'].includes(filters.status)) {
        res.status(400).json({ success: false, error: { message: 'Validation Error: Invalid status filter.' } }); return;
      }
      if (filters.priority && !['Low','Medium','High'].includes(filters.priority)) {
        res.status(400).json({ success: false, error: { message: 'Validation Error: Invalid priority filter.' } }); return;
      }

      const reports = await reportService.getReports(filters);

      res.status(200).json({
        success: true,
        data: reports,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/:id
   * Retrieves a single report with its complete audit history.
   */
  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Report ID must be provided in the URL.' },
        });
        return;
      }

      const report = await reportService.getReportById(id.trim());

      if (!report) {
        res.status(404).json({
          success: false,
          error: { message: `Report not found with ID: ${id}` },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/reports/:id/status
   * Transitions a report status following the strict state machine.
   * Actor identity is authoritatively enforced as 'Coordinator'.
   */
  async updateReportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Report ID must be provided in the URL.' },
        });
        return;
      }

      if (!status || typeof status !== 'string' || !['Draft','Submitted','Assigned','In Progress','Resolved','Rejected'].includes(status)) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Target "status" is required in request body.' },
        });
        return;
      }

      const updatedReport = await reportService.updateReportStatus(
        id.trim(),
        status as ReportStatus,
        typeof note === 'string' ? note : undefined,
        'Coordinator' // Authoritatively assigned by backend
      );

      res.status(200).json({
        success: true,
        data: updatedReport,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/reports/:id/assign
   * Assigns a report to a dispatch team or agency.
   * Actor identity is authoritatively enforced as 'Coordinator'.
   */
  async assignReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { assignedTo, note } = req.body;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Report ID must be provided in the URL.' },
        });
        return;
      }

      if (!assignedTo || typeof assignedTo !== 'string' || !assignedTo.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: "assignedTo" dispatch unit or agency is required.' },
        });
        return;
      }

      const updatedReport = await reportService.assignReport(
        id.trim(),
        assignedTo.trim(),
        typeof note === 'string' ? note : undefined,
        'Coordinator' // Authoritatively assigned by backend
      );

      res.status(200).json({
        success: true,
        data: updatedReport,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/:id/history
   * Retrieves the activity log history for a specific report.
   */
  async getReportHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Report ID must be provided in the URL.' },
        });
        return;
      }

      // Check report existence first to return accurate 404 for nonexistent reports
      const report = await reportService.getReportById(id.trim());
      if (!report) {
        res.status(404).json({
          success: false,
          error: { message: `Report not found with ID: ${id}` },
        });
        return;
      }

      const logs = await activityHistoryService.getLogsByReportId(id.trim());

      res.status(200).json({
        success: true,
        data: logs,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
