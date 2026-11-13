import { Router } from 'express';
import { announcementController } from '../controllers/announcementController.js';

const router = Router();
router.get('/', (req, res, next) => announcementController.getPublishedAnnouncements(req, res, next));
router.get('/:id', (req, res, next) => announcementController.getPublishedAnnouncementById(req, res, next));
export default router;
