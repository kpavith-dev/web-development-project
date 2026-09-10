import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateMongoId, handleValidationErrors } from '../middleware/validationMiddleware.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', validateMongoId, handleValidationErrors, markNotificationRead);

export default router;