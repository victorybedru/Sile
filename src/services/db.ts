/**
 * IndexedDB Local Database Service for Sile
 * Provides durable offline storage for community reports and announcements.
 * Does not rely on localStorage as the primary report store.
 */

import { Announcement, Report } from '../types';
import { INITIAL_SAMPLE_ANNOUNCEMENTS, INITIAL_SAMPLE_REPORTS } from './sampleData';

const DB_NAME = 'sile_local_db';
const DB_VERSION = 1;

const STORES = {
  REPORTS: 'reports',
  ANNOUNCEMENTS: 'announcements',
  SETTINGS: 'settings',
} as const;

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      // Check for IndexedDB support in environment
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Reports Store
        if (!db.objectStoreNames.contains(STORES.REPORTS)) {
          const reportStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
          reportStore.createIndex('createdAt', 'createdAt', { unique: false });
          reportStore.createIndex('status', 'status', { unique: false });
          reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          reportStore.createIndex('subCity', 'subCity', { unique: false });
        }

        // Announcements Store
        if (!db.objectStoreNames.contains(STORES.ANNOUNCEMENTS)) {
          const annStore = db.createObjectStore(STORES.ANNOUNCEMENTS, { keyPath: 'id' });
          annStore.createIndex('subCity', 'subCity', { unique: false });
          annStore.createIndex('category', 'category', { unique: false });
          annStore.createIndex('publishedAt', 'publishedAt', { unique: false });
        }

        // Settings / Key-Value Store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('[IndexedDB] Failed to open database:', error);
        reject(error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Initializes database and seeds sample announcements and reports if empty
   */
  async init(): Promise<void> {
    const db = await this.openDB();
    const annCount = await this.getStoreCount(db, STORES.ANNOUNCEMENTS);
    if (annCount === 0) {
      const tx = db.transaction(STORES.ANNOUNCEMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ANNOUNCEMENTS);
      for (const ann of INITIAL_SAMPLE_ANNOUNCEMENTS) {
        store.put(ann);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    const reportCount = await this.getStoreCount(db, STORES.REPORTS);
    if (reportCount === 0) {
      const tx = db.transaction(STORES.REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.REPORTS);
      for (const rep of INITIAL_SAMPLE_REPORTS) {
        store.put(rep);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  private getStoreCount(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // =================== Reports Operations ===================

  async getAllReports(): Promise<Report[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.REPORTS, 'readonly');
      const store = tx.objectStore(STORES.REPORTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const reports: Report[] = req.result || [];
        // Sort descending by creation date
        reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(reports);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getReportById(id: string): Promise<Report | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.REPORTS, 'readonly');
      const store = tx.objectStore(STORES.REPORTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveReport(report: Report): Promise<Report> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.REPORTS);
      const req = store.put(report);
      req.onsuccess = () => resolve(report);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteReport(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.REPORTS, 'readwrite');
      const store = tx.objectStore(STORES.REPORTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingReports(): Promise<Report[]> {
    const all = await this.getAllReports();
    return all.filter((r) => r.status !== 'Draft' && (r.syncStatus === 'Pending' || r.syncStatus === 'Failed'));
  }

  // =================== Announcements Operations ===================

  async getAllAnnouncements(): Promise<Announcement[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANNOUNCEMENTS, 'readonly');
      const store = tx.objectStore(STORES.ANNOUNCEMENTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: Announcement[] = req.result || [];
        // Sort newest published first
        items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveAnnouncement(ann: Announcement): Promise<Announcement> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANNOUNCEMENTS, 'readwrite');
      const store = tx.objectStore(STORES.ANNOUNCEMENTS);
      const req = store.put(ann);
      req.onsuccess = () => resolve(ann);
      req.onerror = () => reject(req.error);
    });
  }

  // =================== Key-Value Settings ===================

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.SETTINGS, 'readonly');
        const store = tx.objectStore(STORES.SETTINGS);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && 'value' in req.result) {
            resolve(req.result.value as T);
          } else {
            resolve(defaultValue);
          }
        };
        req.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = tx.objectStore(STORES.SETTINGS);
        const req = store.put({ key, value, updatedAt: new Date().toISOString() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('[IndexedDB] setSetting error:', e);
    }
  }

  /**
   * Resets database back to default state (useful for test resets and clean demos)
   */
  async resetToDemoState(): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction([STORES.REPORTS, STORES.ANNOUNCEMENTS], 'readwrite');
    tx.objectStore(STORES.REPORTS).clear();
    tx.objectStore(STORES.ANNOUNCEMENTS).clear();
    for (const ann of INITIAL_SAMPLE_ANNOUNCEMENTS) {
      tx.objectStore(STORES.ANNOUNCEMENTS).put(ann);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localDB = new LocalDatabase();
