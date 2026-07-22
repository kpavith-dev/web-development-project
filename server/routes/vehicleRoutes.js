import express from 'express';
import { createVehicle, getVehicles, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import multer from 'multer';

const storage = multer.diskStorage({ destination: 'uploads/vehicles', filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')) });

const router = express.Router();

router.post('/', authenticate, upload.single('image'), createVehicle);
router.get('/', authenticate, getVehicles);
router.put('/:id', authenticate, upload.single('image'), updateVehicle);
router.delete('/:id', authenticate, deleteVehicle);

export default router;
