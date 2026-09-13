import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { requestLogger, logger } from './utils/logger.js';
import { corsOrigin } from './utils/cors.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import areaRoutes from './routes/areaRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'client', 'dist');

export const createApp = () => {
  fs.mkdirSync(path.join(__dirname, 'uploads', 'vehicles'), { recursive: true });
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json());
  app.use(requestLogger);
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.get('/api/health', (_req, res) => res.json({ success: true, service: 'smart-campus-parking-server', database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable' }));
  app.get('/api', (_req, res) => res.json({ success: true, message: 'Smart Campus Parking API is running.', health: '/api/health' }));
  app.use('/api', (_req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ success: false, message: 'Database is temporarily unavailable. Check the MongoDB connection and Atlas network access.' }));
  app.use('/api/', apiLimiter);
  app.use('/api/auth', authRoutes); app.use('/api/users', userRoutes); app.use('/api/areas', areaRoutes); app.use('/api/slots', slotRoutes); app.use('/api/reservations', reservationRoutes); app.use('/api/security', securityRoutes); app.use('/api/dashboard', dashboardRoutes); app.use('/api/vehicles', vehicleRoutes); app.use('/api/reports', reportRoutes); app.use('/api/feedback', feedbackRoutes); app.use('/api/notifications', notificationRoutes);
  if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) { app.use(express.static(clientDist)); app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html'))); }
  app.use((err, req, res, _next) => { logger.error('Unhandled error', err, { path: req.path, method: req.method }); const status = err.status || 500; res.status(status).json({ success: false, message: process.env.NODE_ENV === 'production' && status >= 500 ? 'Server error' : (err.message || 'Server error') }); });
  return app;
};

export default createApp;
