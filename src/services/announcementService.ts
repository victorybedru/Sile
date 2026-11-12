/**
 * Announcement Service for Sile
 * Handles retrieval, location/category filtering, and coordinator publishing.
 */

import { Announcement, ServiceCategory, SubCity } from '../types';
import { localDB } from './db';
import { mockApi } from './mockApi';

export interface CreateAnnouncementInput {
  title: string;
  category: 'Electricity' | 'Water' | 'Roads';
  subCity: SubCity | 'All Areas';
  affectedNeighborhoods?: string;
  description: string;
  isPlanned: boolean;
  startDate?: string;
  expectedEndDate?: string;
  isPublished?: boolean;
}

export class AnnouncementService {
  /**
   * Fetches all published announcements
   */
  async getPublishedAnnouncements(filters?: {
    subCity?: SubCity | 'All Areas' | null;
    category?: ServiceCategory | 'All' | null;
  }): Promise<Announcement[]> {
    const all = await localDB.getAllAnnouncements();
    return all.filter((item) => {
      if (!item.isPublished) return false;

      // SubCity filter: Include item if it matches the requested sub-city OR is applicable to 'All Areas'
      if (filters?.subCity && filters.subCity !== 'All Areas') {
        const matchesArea =
          item.subCity === filters.subCity || item.subCity === 'All Areas';
        if (!matchesArea) return false;
      }

      // Category filter
      if (filters?.category && filters.category !== 'All') {
        if (item.category !== filters.category) return false;
      }

      return true;
    });
  }

  /**
   * Fetches all announcements (for coordinator management)
   */
  async getAllAnnouncements(): Promise<Announcement[]> {
    return localDB.getAllAnnouncements();
  }

  /**
   * Coordinator creation of new service announcements
   */
  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    if (!input.title || input.title.trim().length < 5) {
      throw new Error('Announcement title must be at least 5 characters long.');
    }
    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Announcement description must provide clear details (at least 10 characters).');
    }

    const now = new Date().toISOString();
    const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const announcement: Announcement = {
      id,
      title: input.title.trim(),
      category: input.category,
      subCity: input.subCity,
      affectedNeighborhoods: input.affectedNeighborhoods?.trim() || undefined,
      description: input.description.trim(),
      isPlanned: input.isPlanned,
      startDate: input.startDate || undefined,
      expectedEndDate: input.expectedEndDate || undefined,
      publishedAt: now,
      isPublished: input.isPublished ?? true,
      isSampleData: true, // Clearly marked as prototype demo data
      publisherName: 'Addis Ababa District Coordination Desk',
    };

    // Save to local IndexedDB
    await localDB.saveAnnouncement(announcement);

    // Also push to mock API
    try {
      await mockApi.publishAnnouncement(announcement);
    } catch (e) {
      console.warn('[AnnouncementService] Could not publish to remote mock API immediately:', e);
    }

    return announcement;
  }

  /**
   * Updates an existing announcement
   */
  async updateAnnouncement(announcement: Announcement): Promise<Announcement> {
    await localDB.saveAnnouncement(announcement);
    return announcement;
  }
}

export const announcementService = new AnnouncementService();
