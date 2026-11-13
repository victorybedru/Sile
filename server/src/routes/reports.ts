/**
 * Reports Router
 * File: server/src/routes/reports.ts
 * 
 * Maps HTTP routes for report submission, offline batch synchronization,
 * filtering, single report retrieval, coordinator workflow transitions,
 * agency assignment, and audit history.
 */

import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';
import { requireCoordinator } from '../middleware/auth.js';

const router = Router();

// 1. Submit a single resident report (Idempotent: 201 Created or 200 Duplicate Ack)
router.post('/', (req, res, next) => reportController.submitReport(req, res, next));

// 2. Batch synchronize offline reports
router.post('/sync', (req, res, next) => reportController.batchSync(req, res, next));
router.post('/batch-sync', (req, res, next) => reportController.batchSync(req, res, next));

// 3. Retrieve reports with optional query filters (subCity, category, status, priority)
router.get('/', (req, res, next) => reportController.getReports(req, res, next));

// 4. Retrieve one report by ID
router.get('/:id', (req, res, next) => reportController.getReportById(req, res, next));

// 5. Retrieve activity log history for a specific report
router.get('/:id/history', (req, res, next) => reportController.getReportHistory(req, res, next));

// 6. Update report status (Coordinator restricted)
router.patch('/:id/status', requireCoordinator, (req, res, next) =>
  reportController.updateReportStatus(req, res, next)
);

// 7. Assign report to agency / dispatch unit (Coordinator restricted)
router.patch('/:id/assign', requireCoordinator, (req, res, next) =>
  reportController.assignReport(req, res, next)
);

export default router;
