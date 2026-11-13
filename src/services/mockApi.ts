/**
 * Mock API Service Layer for Sile
 * Simulates the future Antigravity / Supabase backend REST API.
 * 
 * Enforces:
 * - Idempotency (re-transmitting the same local report ID updates or acknowledges rather than creating duplicates)
 * - Explicit server confirmation before marking reports Synchronized
 * - Simulated network delays and connection interruption simulation
 */

import { Announcement, Report } from '../types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  serverTimestamp: string;
  isDuplicateAck?: boolean;
}

class MockApiService {
  // Simulated server-side database
  private serverReports: Map<string, Report> = new Map();
  private simulateFailure = false;
  private networkLatencyMs = 400;

  /**
   * Allows tests or coordinator UI to toggle simulated backend availability
   */
  setSimulateFailure(fail: boolean) {
    this.simulateFailure = fail;
  }

  isSimulatingFailure(): boolean {
    return this.simulateFailure;
  }

  setLatency(ms: number) {
    this.networkLatencyMs = ms;
  }

  private async delay(): Promise<void> {
    if (this.networkLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.networkLatencyMs));
    }
  }

  /**
   * Idempotent report submission endpoint
   * POST /api/v1/reports
   */
  async submitReport(report: Report): Promise<ApiResponse<Report>> {
    await this.delay();

    if (this.simulateFailure) {
      throw new Error('Connection refused: Backend server is temporarily unreachable (Simulated Network Error)');
    }

    const serverTimestamp = new Date().toISOString();

    // Check idempotency: If report already exists on server, acknowledge without duplication
    const alreadyExists = this.serverReports.has(report.id);

    // Save or update server record
    const serverRecord: Report = {
      ...report,
      syncStatus: 'Synchronized',
      updatedAt: serverTimestamp,
    };
    this.serverReports.set(report.id, serverRecord);

    return {
      success: true,
      data: serverRecord,
      serverTimestamp,
      isDuplicateAck: alreadyExists,
    };
  }

  /**
   * Batch synchronization endpoint
   * POST /api/v1/reports/batch-sync
   */
  async batchSync(reports: Report[]): Promise<
    ApiResponse<{
      successfulIds: string[];
      failedIds: { id: string; error: string }[];
    }>
  > {
    await this.delay();

    if (this.simulateFailure) {
      throw new Error('Network timeout: Could not connect to remote synchronization gateway');
    }

    const successfulIds: string[] = [];
    const failedIds: { id: string; error: string }[] = [];
    const serverTimestamp = new Date().toISOString();

    for (const report of reports) {
      try {
        this.serverReports.set(report.id, {
          ...report,
          syncStatus: 'Synchronized',
          updatedAt: serverTimestamp,
        });
        successfulIds.push(report.id);
      } catch (err) {
        failedIds.push({
          id: report.id,
          error: err instanceof Error ? err.message : 'Unknown sync failure',
        });
      }
    }

    return {
      success: true,
      data: {
        successfulIds,
        failedIds,
      },
      serverTimestamp,
    };
  }

  /**
   * Retrieves reports registered on the mock server
   */
  async getServerReports(): Promise<Report[]> {
    await this.delay();
    return Array.from(this.serverReports.values());
  }

  /**
   * Publishes announcement to backend
   */
  async publishAnnouncement(announcement: Announcement): Promise<ApiResponse<Announcement>> {
    await this.delay();

    if (this.simulateFailure) {
      throw new Error('Could not publish announcement: Server unreachable');
    }

    return {
      success: true,
      data: announcement,
      serverTimestamp: new Date().toISOString(),
    };
  }
}

export const mockApi = new MockApiService();
