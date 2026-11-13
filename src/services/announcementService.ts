/** Announcement retrieval and coordinator publishing with an IndexedDB cache. */
import { Announcement, ServiceCategory, SubCity } from '../types';
import { localDB } from './db';
import { apiRequest, getApiRole } from './apiClient';

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

interface ApiList<T> { success: boolean; data: T[] }
interface ApiItem<T> { success: boolean; data: T }

export class AnnouncementService {
  async getPublishedAnnouncements(filters?: {
    subCity?: SubCity | 'All Areas' | null;
    category?: ServiceCategory | 'All' | null;
  }): Promise<Announcement[]> {
    const all = await this.getAllAnnouncements();
    return all.filter((item) => {
      if (!item.isPublished) return false;
      if (filters?.subCity && filters.subCity !== 'All Areas' && item.subCity !== filters.subCity && item.subCity !== 'All Areas') return false;
      if (filters?.category && filters.category !== 'All' && item.category !== filters.category) return false;
      return true;
    });
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    const cachedAll = await localDB.getAllAnnouncements();
    const cached = getApiRole() === 'coordinator' ? cachedAll : cachedAll.filter((item) => item.isPublished);
    try {
      const path = getApiRole() === 'coordinator' ? '/coordinator/announcements' : '/announcements';
      const response = await apiRequest<ApiList<Announcement>>(path);
      const remote = response.data || [];
      await Promise.all(remote.map((announcement) => localDB.saveAnnouncement(announcement)));
      const merged = new Map<string, Announcement>();
      cached.forEach((item) => merged.set(item.id, item));
      remote.forEach((item) => merged.set(item.id, item));
      return [...merged.values()].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } catch (error) {
      // Previously cached and sample announcements remain available offline.
      console.warn('[AnnouncementService] Using cached announcements:', error);
      return cached;
    }
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    if (!input.title || input.title.trim().length < 5) throw new Error('Announcement title must be at least 5 characters long.');
    if (!input.description || input.description.trim().length < 10) throw new Error('Announcement description must provide clear details (at least 10 characters).');
    const response = await apiRequest<ApiItem<Announcement>>('/coordinator/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await localDB.saveAnnouncement(response.data);
    return response.data;
  }

  async updateAnnouncement(announcement: Announcement): Promise<Announcement> {
    const response = await apiRequest<ApiItem<Announcement>>(`/coordinator/announcements/${encodeURIComponent(announcement.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: announcement.title,
        category: announcement.category,
        subCity: announcement.subCity,
        affectedNeighborhoods: announcement.affectedNeighborhoods,
        description: announcement.description,
        isPlanned: announcement.isPlanned,
        startDate: announcement.startDate,
        expectedEndDate: announcement.expectedEndDate,
        isPublished: announcement.isPublished,
      }),
    });
    await localDB.saveAnnouncement(response.data);
    return response.data;
  }

  async setPublished(id: string, isPublished: boolean): Promise<Announcement> {
    const response = await apiRequest<ApiItem<Announcement>>(`/coordinator/announcements/${encodeURIComponent(id)}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished }),
    });
    await localDB.saveAnnouncement(response.data);
    return response.data;
  }
}

export const announcementService = new AnnouncementService();
