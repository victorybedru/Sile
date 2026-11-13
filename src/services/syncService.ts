/**
 * Synchronization Service for Sile
 * Manages the offline-to-online sync queue, retry logic, duplicate prevention,
 * and connection monitoring.
 */

import { Report, SyncStatus } from '../types';
import { localDB } from './db';
import { apiRequest } from './apiClient';

type SyncListener = () => void;
type SyncTransport = (report: Report) => Promise<{
  success: boolean;
  data: Report;
  isDuplicateAck?: boolean;
  serverTimestamp: string;
}>;

class SyncService {
  private isSimulatedOffline = false;
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private transport: SyncTransport = (report) => this.sendToServer(report);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners();
        this.triggerAutoSync();
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });
    }
  }

  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[SyncService] Listener error:', err);
      }
    }
  }

  /**
   * Returns true if device has genuine network connectivity and is not simulated offline
   */
  isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  isOfflineSimulated(): boolean {
    return this.isSimulatedOffline;
  }

  setSimulatedOffline(offline: boolean): void {
    this.isSimulatedOffline = offline;
    this.notifyListeners();
    if (!offline) {
      this.triggerAutoSync();
    }
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Allows the in-app reliability suite to use an isolated mock transport.
   * Production behavior always defaults to the real Express API.
   */
  setTransportForTests(transport?: SyncTransport): void {
    this.transport = transport || ((report) => this.sendToServer(report));
  }

  private async sendToServer(report: Report) {
    return apiRequest<{ success: boolean; data: Report; isDuplicateAck?: boolean; serverTimestamp: string }>('/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  /**
   * Synchronizes a single report by ID idempotently
   */
  async syncReport(reportId: string): Promise<Report> {
    const report = await localDB.getReportById(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found in local database.`);
    }

    // If already synchronized, return as-is
    if (report.syncStatus === 'Synchronized') {
      return report;
    }

    const now = new Date().toISOString();
    const attempts = (report.syncAttempts || 0) + 1;

    // Check connectivity before attempting
    if (!this.isOnline()) {
      const failedReport: Report = {
        ...report,
        syncStatus: 'Failed',
        syncAttempts: attempts,
        lastSyncAttemptAt: now,
        syncErrorMessage: 'Device is offline. Stored safely locally, will retry when connected.',
        history: [
          ...report.history,
          {
            id: `act-${Date.now()}-sync-fail`,
            reportId: report.id,
            timestamp: now,
            action: 'Synchronization Attempted (Offline)',
            details: 'Device is offline. Report remains safely preserved in local storage.',
            actor: 'System',
          },
        ],
      };
      await localDB.saveReport(failedReport);
      this.notifyListeners();
      return failedReport;
    }

    // Record sync attempt in progress
    const attemptLog = {
      id: `act-${Date.now()}-sync-att`,
      reportId: report.id,
      timestamp: now,
      action: 'Synchronization Attempted',
      details: `Attempt #${attempts} sending report to remote server gateway using ID: ${report.id}`,
      actor: 'System' as const,
    };

    try {
      const response = await this.transport(report);

      if (response.success && response.data) {
        const successLog = {
          id: `act-${Date.now()}-sync-ok`,
          reportId: report.id,
          timestamp: response.serverTimestamp,
          action: 'Synchronization Succeeded',
          details: response.isDuplicateAck
            ? 'Server acknowledged existing report without duplicate creation (Idempotent confirmation).'
            : 'Server verified and stored report in central database.',
          actor: 'System' as const,
        };

        const synchronizedReport: Report = {
          ...response.data,
          syncStatus: 'Synchronized',
          syncAttempts: attempts,
          lastSyncAttemptAt: response.serverTimestamp,
          syncErrorMessage: undefined,
          history: [...report.history, attemptLog, successLog],
        };

        await localDB.saveReport(synchronizedReport);
        this.notifyListeners();
        return synchronizedReport;
      } else {
        throw new Error('Server rejected synchronization');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown network failure';
      const failLog = {
        id: `act-${Date.now()}-sync-err`,
        reportId: report.id,
        timestamp: new Date().toISOString(),
        action: 'Synchronization Failed',
        details: `Transmission failed: ${errorMessage}. Report remains safely preserved locally.`,
        actor: 'System' as const,
      };

      const failedReport: Report = {
        ...report,
        syncStatus: 'Failed',
        syncAttempts: attempts,
        lastSyncAttemptAt: new Date().toISOString(),
        syncErrorMessage: errorMessage,
        history: [...report.history, attemptLog, failLog],
      };

      await localDB.saveReport(failedReport);
      this.notifyListeners();
      return failedReport;
    }
  }

  /**
   * Synchronizes all Pending or Failed reports
   */
  async syncAllPendingReports(): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    if (this.isSyncing) {
      return { total: 0, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const pending = await localDB.getPendingReports();
      let syncedCount = 0;
      let failedCount = 0;

      for (const report of pending) {
        const res = await this.syncReport(report.id);
        if (res.syncStatus === 'Synchronized') {
          syncedCount++;
        } else {
          failedCount++;
        }
      }

      return {
        total: pending.length,
        synced: syncedCount,
        failed: failedCount,
      };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Automatically triggered when connectivity returns
   */
  private triggerAutoSync(): void {
    if (this.isOnline()) {
      // Small pause to allow socket stability
      setTimeout(() => {
        this.syncAllPendingReports().catch((e) =>
          console.warn('[SyncService] Auto-sync error:', e)
        );
      }, 500);
    }
  }
}

export const syncService = new SyncService();
