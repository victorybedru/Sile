/**
 * Announcement Service
 * File: server/src/services/announcementService.ts
 * 
 * Manages community service announcements, filtering by sub-city and category,
 * coordinator creation, editing, and publishing controls.
 */

import { supabase } from '../config/supabase.js';
import {
  ALL_SUBCITIES,
  Announcement,
  AnnouncementFilters,
  CreateAnnouncementInput,
  DbAnnouncementRow,
  UpdateAnnouncementInput,
} from '../types/index.js';
import {
  AnnouncementMappingOptions,
  mapApiAnnouncementToDb,
  mapDbAnnouncementToApi,
} from '../utils/mappers.js';

export class AnnouncementService {
  /**
   * Retrieves published announcements for public resident viewing.
   * Unpublished announcements are strictly excluded.
   * 
   * Sub-city matching rule:
   * When a specific sub-city is requested (e.g., 'Bole'), announcements matching
   * 'Bole' OR citywide notices ('All Areas') are included.
   */
  async getPublishedAnnouncements(filters?: AnnouncementFilters): Promise<Announcement[]> {
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (filters?.subCity && filters.subCity !== 'All Areas') {
      query = query.or(`sub_city.eq.${filters.subCity},sub_city.eq.All Areas`);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve published announcements: ${error.message}`);
    }

    const rows = (data as DbAnnouncementRow[]) || [];
    return rows.map(mapDbAnnouncementToApi);
  }

  /**
   * Retrieves all announcements (published and unpublished) for coordinator management.
   */
  async getAllAnnouncements(filters?: AnnouncementFilters): Promise<Announcement[]> {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });

    if (typeof filters?.isPublished === 'boolean') {
      query = query.eq('is_published', filters.isPublished);
    }

    if (filters?.subCity && filters.subCity !== 'All Areas') {
      query = query.or(`sub_city.eq.${filters.subCity},sub_city.eq.All Areas`);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to retrieve announcements: ${error.message}`);
    }

    const rows = (data as DbAnnouncementRow[]) || [];
    return rows.map(mapDbAnnouncementToApi);
  }

  /**
   * Retrieves a single announcement by its unique ID.
   */
  async getAnnouncementById(id: string): Promise<Announcement | null> {
    const trimmedId = id.trim();
    if (!trimmedId) return null;

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', trimmedId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve announcement ${trimmedId}: ${error.message}`);
    }

    if (!data) return null;

    return mapDbAnnouncementToApi(data as DbAnnouncementRow);
  }

  /**
   * Creates a new community service announcement.
   * Enforces trusted backend publisher identity and defaults isSampleData to false.
   */
  async createAnnouncement(
    input: CreateAnnouncementInput,
    options?: AnnouncementMappingOptions
  ): Promise<Announcement> {
    const trimmedTitle = input.title?.trim();
    if (!trimmedTitle || trimmedTitle.length < 5) {
      throw new Error('Validation Error: Announcement title must be at least 5 characters long.');
    }

    const trimmedDesc = input.description?.trim();
    if (!trimmedDesc || trimmedDesc.length < 10) {
      throw new Error('Validation Error: Announcement description must provide clear details (at least 10 characters).');
    }

    if (!['Electricity', 'Water', 'Roads'].includes(input.category)) {
      throw new Error(`Validation Error: Invalid announcement category: "${input.category}". Must be Electricity, Water, or Roads.`);
    }

    if (input.subCity !== 'All Areas' && !ALL_SUBCITIES.includes(input.subCity as any)) {
      throw new Error(`Validation Error: Invalid sub-city: "${input.subCity}".`);
    }

    const dbRow = mapApiAnnouncementToDb(input, options);

    const { data, error } = await supabase
      .from('announcements')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create announcement: ${error.message}`);
    }

    return mapDbAnnouncementToApi(data as DbAnnouncementRow);
  }

  /**
   * Updates an existing announcement.
   */
  async updateAnnouncement(
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<Announcement> {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('Announcement ID cannot be empty.');
    }

    const existing = await this.getAnnouncementById(trimmedId);
    if (!existing) {
      throw new Error(`Announcement not found with ID: ${trimmedId}`);
    }

    const updatePayload: Partial<DbAnnouncementRow> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (trimmed.length < 5) {
        throw new Error('Validation Error: Announcement title must be at least 5 characters long.');
      }
      updatePayload.title = trimmed;
    }

    if (input.description !== undefined) {
      const trimmed = input.description.trim();
      if (trimmed.length < 10) {
        throw new Error('Validation Error: Announcement description must be at least 10 characters long.');
      }
      updatePayload.description = trimmed;
    }

    if (input.category !== undefined) {
      if (!['Electricity', 'Water', 'Roads'].includes(input.category)) {
        throw new Error(`Validation Error: Invalid category: "${input.category}".`);
      }
      updatePayload.category = input.category;
    }

    if (input.subCity !== undefined) {
      if (input.subCity !== 'All Areas' && !ALL_SUBCITIES.includes(input.subCity as any)) {
        throw new Error(`Validation Error: Invalid sub-city: "${input.subCity}".`);
      }
      updatePayload.sub_city = input.subCity;
    }

    if (input.affectedNeighborhoods !== undefined) {
      updatePayload.affected_neighborhoods = input.affectedNeighborhoods.trim() || null;
    }

    if (typeof input.isPlanned === 'boolean') {
      updatePayload.is_planned = input.isPlanned;
    }

    if (input.startDate !== undefined) {
      updatePayload.start_date = input.startDate || null;
    }

    if (input.expectedEndDate !== undefined) {
      updatePayload.expected_end_date = input.expectedEndDate || null;
    }

    if (typeof input.isPublished === 'boolean') {
      updatePayload.is_published = input.isPublished;
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updatePayload)
      .eq('id', trimmedId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update announcement: ${error.message}`);
    }

    return mapDbAnnouncementToApi(data as DbAnnouncementRow);
  }

  /**
   * Publishes or unpublishes an announcement.
   */
  async setAnnouncementPublished(id: string, isPublished: boolean): Promise<Announcement> {
    return this.updateAnnouncement(id, { isPublished });
  }
}

export const announcementService = new AnnouncementService();
