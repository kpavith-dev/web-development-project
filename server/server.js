import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import { initializeSocket } from './socket.js';
import { processReservationLifecycle } from './services/reservationLifecycle.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { requestLogger, logger } from './utils/logger.js';
import validateEnvironment from './utils/validateEnv.js';
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

dotenv.config();

// Validate environment variables before starting
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
fs.mkdirSync(path.join(__dirname, 'uploads', 'vehicles'), { recursive: true });

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());
app.use(requestLogger);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Smart Campus Parking API is running.' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Campus Parking API is running.',
    health: '/api/health'
  });
});

app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable. Check the MongoDB connection and Atlas network access.'
    });
  }
  return next();
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err, req, res, next) => {
  logger.error('Unhandled error', err, { path: req.path, method: req.method });
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

mongoose.set('strictQuery', false);

const connectDatabase = async () => {
  try {
await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
});
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection failed, continuing without database for local preview:', error.message);
    return false;
  }
  return true;
};

connectDatabase()
  .then(() => {
    initializeSocket(httpServer);
    processReservationLifecycle().catch(console.error);
    setInterval(() => processReservationLifecycle().catch(console.error), 60 * 1000);
    httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
