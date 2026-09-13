import express from 'express';
import { createVehicle, getVehicles, updateVehicle, deleteVehicle, getAdminVehicles, verifyVehicle, rejectVehicle, setVehicleActiveState } from '../controllers/vehicleController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import multer from 'multer';

const storage = multer.diskStorage({ destination: 'uploads/vehicles', filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`) });
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, allowedImageTypes.has(file.mimetype) ? null : new Error('Only JPEG, PNG, and WebP images are allowed'), allowedImageTypes.has(file.mimetype)) });

const router = express.Router();

router.post('/', authenticate, upload.single('image'), createVehicle);
router.get('/admin', authenticate, authorizeRole('admin'), getAdminVehicles);
router.patch('/:id/verify', authenticate, authorizeRole('admin'), verifyVehicle);
router.patch('/:id/reject', authenticate, authorizeRole('admin'), rejectVehicle);
router.patch('/:id/active', authenticate, authorizeRole('admin'), setVehicleActiveState);
router.get('/', authenticate, getVehicles);
router.put('/:id', authenticate, upload.single('image'), updateVehicle);
router.delete('/:id', authenticate, deleteVehicle);

export default router;
