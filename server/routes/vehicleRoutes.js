import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVehicle, getVehicles, updateVehicle, deleteVehicle, getAdminVehicles, verifyVehicle, rejectVehicle, setVehicleActiveState } from '../controllers/vehicleController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const vehicleUploadDir = path.resolve(__dirname, '..', 'uploads', 'vehicles');

const storage = multer.diskStorage({
  destination: vehicleUploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`)
});
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
// fileFilter must call cb(error) to reject or cb(null, true) to accept.
// The previous code incorrectly passed 3 arguments; multer only accepts 2.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedImageTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

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
