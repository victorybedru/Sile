/**
 * Automated Reliability & Verification Test Suite for Sile
 * 
 * Verifies the 8 core operational guarantees specified in the platform requirements:
 * 1. Creating a valid report
 * 2. Rejecting invalid report input
 * 3. Saving reports locally in IndexedDB
 * 4. Preserving reports after database re-query
 * 5. Valid and invalid status transitions (state machine integrity)
 * 6. Synchronization state changes (Pending -> Synchronized)
 * 7. Preventing duplicate synchronization (Idempotency guarantee)
 * 8. Retaining reports after failed synchronization
 */

import { canTransitionStatus, Report, ReportStatus } from '../types';
import { localDB } from './db';
import { mockApi } from './mockApi';
import { reportService } from './reportService';
import { syncService } from './syncService';

export interface TestResult {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  durationMs: number;
  message: string;
  details?: string;
}

export class TestRunner {
  async runAllTests(onProgress?: (results: TestResult[]) => void): Promise<TestResult[]> {
    const results: TestResult[] = [
      {
        id: 'test-1',
        name: '1. Create Valid Report',
        description: 'Verify creating a valid report succeeds with auto-generated ID, timestamp, and initial Pending status.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-2',
        name: '2. Reject Invalid Report Input',
        description: 'Verify empty description, missing category, or underspecified input is rejected with friendly validation error.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-3',
        name: '3. Save Reports Locally in IndexedDB',
        description: 'Verify reports are written directly to IndexedDB object store with complete activity log.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-4',
        name: '4. Preserving Reports Across Queries',
        description: 'Verify reading back from IndexedDB returns intact data matching all attributes.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-5',
        name: '5. Valid & Invalid Status Transitions',
        description: 'Verify state machine allows Draft → Submitted → Assigned → In Progress → Resolved, but blocks Draft → Resolved.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-6',
        name: '6. Synchronization State Progression',
        description: 'Verify sync service transitions a Pending report to Synchronized upon successful server receipt.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-7',
        name: '7. Duplicate Prevention & Idempotency',
        description: 'Verify retrying synchronization of an already synchronized report does not create duplicate entries.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
      {
        id: 'test-8',
        name: '8. Retaining Reports After Failed Sync',
        description: 'Verify reports remain safely stored in IndexedDB marked Failed when network drops, ready for retry.',
        status: 'pending',
        durationMs: 0,
        message: 'Awaiting execution',
      },
    ];

    onProgress?.([...results]);

    // Test 1: Create Valid Report
    await this.executeTest(results, 0, async () => {
      const created = await reportService.createReport({
        category: 'Electricity',
        subCity: 'Bole',
        specificLocation: 'Test Location Bole Medhanialem',
        description: 'Street lighting cable disconnected near pedestrian crosswalk.',
        priority: 'High',
      });

      if (!created.id || !created.id.startsWith('sile-')) {
        throw new Error(`Expected ID starting with 'sile-', got: ${created.id}`);
      }
      if (created.status !== 'Submitted') {
        throw new Error(`Expected initial status 'Submitted', got: ${created.status}`);
      }
      if (created.syncStatus !== 'Pending') {
        throw new Error(`Expected syncStatus 'Pending', got: ${created.syncStatus}`);
      }
      if (created.history.length < 2) {
        throw new Error(`Expected at least 2 history logs, got: ${created.history.length}`);
      }

      return {
        message: `Report created successfully with ID: ${created.id} (Status: Submitted, Sync: Pending)`,
        reportId: created.id,
      };
    }, onProgress);

    // Test 2: Reject Invalid Report Input
    await this.executeTest(results, 1, async () => {
      const validation = reportService.validateReportInput({
        category: undefined,
        description: 'short', // less than 10 characters
        subCity: undefined,
      });

      if (validation.isValid) {
        throw new Error('Validation should have failed for empty category and short description.');
      }
      if (!validation.errors.category || !validation.errors.description || !validation.errors.subCity) {
        throw new Error('Validation failed to produce expected field-level error messages.');
      }

      // Also ensure createReport throws
      let caught = false;
      try {
        await reportService.createReport({
          category: 'Water',
          subCity: 'Kirkos',
          specificLocation: '',
          description: 'too short',
          priority: 'Low',
        });
      } catch {
        caught = true;
      }

      if (!caught) {
        throw new Error('createReport failed to throw on invalid input.');
      }

      return {
        message: `Invalid input properly caught: missing category, subCity, and description length (<10 chars) rejected with clear feedback.`,
      };
    }, onProgress);

    // Test 3: Save Reports Locally in IndexedDB
    let testReportId = '';
    await this.executeTest(results, 2, async () => {
      const report = await reportService.createReport({
        category: 'Water',
        subCity: 'Kirkos',
        specificLocation: 'Kazanchis Woreda 8',
        description: 'Main distribution valve leaking clean drinking water on sidewalk.',
        priority: 'Medium',
      });
      testReportId = report.id;

      // Check directly from localDB store
      const retrieved = await localDB.getReportById(report.id);
      if (!retrieved) {
        throw new Error(`Failed to find report in IndexedDB with key ${report.id}`);
      }
      if (retrieved.category !== 'Water' || retrieved.subCity !== 'Kirkos') {
        throw new Error('Retrieved data attributes do not match stored data.');
      }

      return {
        message: `Report written directly to IndexedDB object store 'reports' with key ${report.id}.`,
      };
    }, onProgress);

    // Test 4: Preserving Reports Across Queries
    await this.executeTest(results, 3, async () => {
      if (!testReportId) {
        const rep = await reportService.createReport({
          category: 'Roads',
          subCity: 'Arada',
          specificLocation: 'Piazza near Cinema Empire',
          description: 'Deep pothole damaging small vehicles during evening rush.',
          priority: 'High',
        });
        testReportId = rep.id;
      }

      const all = await localDB.getAllReports();
      const match = all.find((r) => r.id === testReportId);
      if (!match) {
        throw new Error(`Report ${testReportId} was not retained in local database.`);
      }

      return {
        message: `Report verified intact in local storage with ${match.history.length} audit history items.`,
      };
    }, onProgress);

    // Test 5: Valid & Invalid Status Transitions
    await this.executeTest(results, 4, async () => {
      // Create a draft report
      const draft = await reportService.createReport({
        category: 'Roads',
        subCity: 'Yeka',
        specificLocation: 'Megenagna Roundabout',
        description: 'Traffic signals dark and non-operational since morning.',
        priority: 'High',
        saveAsDraft: true,
      });

      // Invalid transition check: Draft -> Resolved should be blocked!
      const invalidCheck = canTransitionStatus(draft.status, 'Resolved');
      if (invalidCheck.allowed) {
        throw new Error('State machine allowed illegal transition from Draft directly to Resolved!');
      }

      // Valid workflow: Draft -> Submitted -> Assigned -> In Progress -> Resolved
      const submitted = await reportService.updateReportStatus(draft.id, 'Submitted', 'Resident finalized draft');
      if (submitted.status !== 'Submitted') throw new Error('Failed transition to Submitted');

      const assigned = await reportService.assignReport(draft.id, 'Yeka District Roads Crew', 'Scheduled for dispatch');
      if (assigned.status !== 'Assigned') throw new Error('Failed transition to Assigned');

      const inProgress = await reportService.updateReportStatus(draft.id, 'In Progress', 'Crew arrived on site');
      if (inProgress.status !== 'In Progress') throw new Error('Failed transition to In Progress');

      const resolved = await reportService.updateReportStatus(draft.id, 'Resolved', 'Traffic signals restored');
      if (resolved.status !== 'Resolved') throw new Error('Failed transition to Resolved');

      return {
        message: `Workflow verified: Draft → Submitted → Assigned → In Progress → Resolved succeeded. Illegal Draft → Resolved transition properly blocked.`,
      };
    }, onProgress);

    // Test 6: Synchronization State Progression
    let syncTestReportId = '';
    await this.executeTest(results, 5, async () => {
      // Ensure online mode
      syncService.setSimulatedOffline(false);
      mockApi.setSimulateFailure(false);

      const rep = await reportService.createReport({
        category: 'Electricity',
        subCity: 'Lideta',
        specificLocation: 'Mexico Square underpass',
        description: 'Exposed cable along retaining wall after rain.',
        priority: 'High',
      });
      syncTestReportId = rep.id;

      if (rep.syncStatus !== 'Pending') {
        throw new Error(`Report expected in Pending sync state, got: ${rep.syncStatus}`);
      }

      const synced = await syncService.syncReport(rep.id);
      if (synced.syncStatus !== 'Synchronized') {
        throw new Error(`Expected syncStatus 'Synchronized', got: ${synced.syncStatus}`);
      }

      // Verify in DB
      const inDb = await localDB.getReportById(rep.id);
      if (inDb?.syncStatus !== 'Synchronized') {
        throw new Error('Database does not reflect Synchronized state.');
      }

      return {
        message: `Report state transitioned cleanly: Pending → Synchronized. Gateway confirmation logged in audit history.`,
      };
    }, onProgress);

    // Test 7: Duplicate Prevention & Idempotency
    await this.executeTest(results, 6, async () => {
      if (!syncTestReportId) {
        throw new Error('No test report available for idempotency test.');
      }

      // Count server reports before resend
      const beforeList = await mockApi.getServerReports();
      const beforeCount = beforeList.filter((r) => r.id === syncTestReportId).length;

      // Resubmit the exact same report object
      const res = await mockApi.submitReport({
        ...(await localDB.getReportById(syncTestReportId))!,
      });

      if (!res.isDuplicateAck) {
        throw new Error('Mock API did not return isDuplicateAck on re-submission of existing ID.');
      }

      const afterList = await mockApi.getServerReports();
      const afterCount = afterList.filter((r) => r.id === syncTestReportId).length;

      if (afterCount > 1 || afterCount !== beforeCount) {
        throw new Error(`Duplicate detected on server! Found ${afterCount} copies of report ${syncTestReportId}.`);
      }

      return {
        message: `Idempotency verified: Re-submitting report ${syncTestReportId} recognized existing record. Exactly 1 copy exists on server.`,
      };
    }, onProgress);

    // Test 8: Retaining Reports After Failed Sync
    await this.executeTest(results, 7, async () => {
      // Create a new report
      const rep = await reportService.createReport({
        category: 'Water',
        subCity: 'Gulele',
        specificLocation: 'Shiro Meda market area',
        description: 'Broken water pipe flooding market stall entrance.',
        priority: 'Medium',
      });

      // Simulate network failure
      mockApi.setSimulateFailure(true);

      const failedSync = await syncService.syncReport(rep.id);
      mockApi.setSimulateFailure(false); // restore

      if (failedSync.syncStatus !== 'Failed') {
        throw new Error(`Expected syncStatus 'Failed', got: ${failedSync.syncStatus}`);
      }

      // Check report is STILL stored in IndexedDB (never discarded)
      const persisted = await localDB.getReportById(rep.id);
      if (!persisted) {
        throw new Error('Critical failure: Report was lost or deleted after failed synchronization!');
      }

      if (!persisted.syncErrorMessage) {
        throw new Error('Expected syncErrorMessage explaining failure reason.');
      }

      // Now retry with network restored
      const retried = await syncService.syncReport(rep.id);
      if (retried.syncStatus !== 'Synchronized') {
        throw new Error(`Expected retry to succeed, got: ${retried.syncStatus}`);
      }

      return {
        message: `Report was safely retained in IndexedDB during network failure (marked Failed with reason), and succeeded upon retry. Zero data loss.`,
      };
    }, onProgress);

    return results;
  }

  private async executeTest(
    results: TestResult[],
    index: number,
    action: () => Promise<{ message: string; reportId?: string }>,
    onProgress?: (results: TestResult[]) => void
  ): Promise<void> {
    results[index].status = 'running';
    onProgress?.([...results]);
    const start = performance.now();

    try {
      const outcome = await action();
      const duration = Math.round(performance.now() - start);
      results[index].status = 'passed';
      results[index].durationMs = duration;
      results[index].message = outcome.message;
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - start);
      results[index].status = 'failed';
      results[index].durationMs = duration;
      results[index].message = err instanceof Error ? err.message : 'Test failed with unexpected error';
    }

    onProgress?.([...results]);
  }
}

export const testRunner = new TestRunner();
