import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { initializeSocket } from './socket.js';
import { processReservationLifecycle } from './services/reservationLifecycle.js';
import { logger } from './utils/logger.js';
import validateEnvironment from './utils/validateEnv.js';
import { createApp } from './app.js';

dotenv.config();
try { validateEnvironment(); } catch (error) { console.error('Environment validation failed:', error.message); process.exit(1); }
mongoose.set('strictQuery', false);
const app = createApp();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

const connectDatabase = async () => {
  try { await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 }); console.log('MongoDB connected'); return true; }
  catch (error) { console.warn('MongoDB connection failed, continuing without database for local preview:', error.message); return false; }
};

connectDatabase().then(() => {
  initializeSocket(httpServer);
  processReservationLifecycle().catch((error) => logger.error('Reservation lifecycle failed', error));
  setInterval(() => processReservationLifecycle().catch((error) => logger.error('Reservation lifecycle failed', error)), 60 * 1000);
  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}).catch((error) => { console.error('Server startup failed:', error); process.exit(1); });
