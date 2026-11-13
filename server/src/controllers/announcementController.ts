/**
 * Announcement Controller
 * File: server/src/controllers/announcementController.ts
 * 
 * Handles HTTP requests for public announcement retrieval and protected
 * coordinator management operations (creation, editing, publishing).
 */

import { NextFunction, Request, Response } from 'express';
import { announcementService } from '../services/announcementService.js';
import { AnnouncementFilters, CreateAnnouncementInput, SubCity, UpdateAnnouncementInput } from '../types/index.js';

export class AnnouncementController {
  /**
   * GET /api/v1/announcements
   * Public endpoint: Retrieves only published announcements.
   */
  async getPublishedAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: AnnouncementFilters = {};

      if (typeof req.query.subCity === 'string') {
        filters.subCity = req.query.subCity as SubCity | 'All Areas';
      }
      if (typeof req.query.category === 'string' && req.query.category !== 'All') {
        filters.category = req.query.category as 'Electricity' | 'Water' | 'Roads';
      }

      const announcements = await announcementService.getPublishedAnnouncements(filters);

      res.status(200).json({
        success: true,
        data: announcements,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/announcements/:id
   * Public endpoint: Retrieves a single published announcement.
   * Returns 404 if the announcement is missing or unpublished.
   */
  async getPublishedAnnouncementById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Announcement ID must be provided in the URL.' },
        });
        return;
      }

      const announcement = await announcementService.getAnnouncementById(id.trim());

      if (!announcement || !announcement.isPublished) {
        res.status(404).json({
          success: false,
          error: { message: `Announcement not found with ID: ${id}` },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: announcement,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/coordinator/announcements
   * Coordinator management endpoint: Retrieves all announcements (published and unpublished).
   */
  async getAllForCoordinator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: AnnouncementFilters = {};

      if (typeof req.query.subCity === 'string') {
        filters.subCity = req.query.subCity as SubCity | 'All Areas';
      }
      if (typeof req.query.category === 'string' && req.query.category !== 'All') {
        filters.category = req.query.category as 'Electricity' | 'Water' | 'Roads';
      }
      if (typeof req.query.isPublished === 'string') {
        filters.isPublished = req.query.isPublished === 'true';
      }

      const announcements = await announcementService.getAllAnnouncements(filters);

      res.status(200).json({
        success: true,
        data: announcements,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/coordinator/announcements
   * Coordinator endpoint: Creates a new municipal announcement.
   */
  async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateAnnouncementInput = req.body;

      if (!input || typeof input !== 'object') {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Request body must be a valid announcement JSON object.' },
        });
        return;
      }

      // Enforce backend-controlled publisher and sample data default
      const announcement = await announcementService.createAnnouncement(input, {
        isSampleData: false,
      });

      res.status(201).json({
        success: true,
        data: announcement,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/coordinator/announcements/:id
   * Coordinator endpoint: Updates an existing announcement.
   */
  async updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input: UpdateAnnouncementInput = req.body;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Announcement ID must be provided in the URL.' },
        });
        return;
      }

      if (!input || typeof input !== 'object') {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Request body must contain update fields.' },
        });
        return;
      }

      const updated = await announcementService.updateAnnouncement(id.trim(), input);

      res.status(200).json({
        success: true,
        data: updated,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/coordinator/announcements/:id/publish
   * Coordinator endpoint: Sets the publication status (publish or unpublish) of an announcement.
   */
  async setPublishStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;

      if (!id || !id.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: Announcement ID must be provided in the URL.' },
        });
        return;
      }

      if (typeof isPublished !== 'boolean') {
        res.status(400).json({
          success: false,
          error: { message: 'Validation Error: "isPublished" boolean value is required.' },
        });
        return;
      }

      const updated = await announcementService.setAnnouncementPublished(id.trim(), isPublished);

      res.status(200).json({
        success: true,
        data: updated,
        serverTimestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const announcementController = new AnnouncementController();
