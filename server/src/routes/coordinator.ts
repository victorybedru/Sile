import { Router } from 'express';
import { announcementController } from '../controllers/announcementController.js';
import { requireCoordinator } from '../middleware/auth.js';

const router = Router();
router.use(requireCoordinator);
router.get('/', (req, res, next) => announcementController.getAllForCoordinator(req, res, next));
router.post('/', (req, res, next) => announcementController.createAnnouncement(req, res, next));
router.patch('/:id', (req, res, next) => announcementController.updateAnnouncement(req, res, next));
router.patch('/:id/publish', (req, res, next) => announcementController.setPublishStatus(req, res, next));
export default router;
