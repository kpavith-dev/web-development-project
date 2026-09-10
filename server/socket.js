import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] } });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id isActive');
      if (!user?.isActive) return next(new Error('Unauthorized'));
      socket.userId = user._id.toString();
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });
  io.on('connection', (socket) => socket.join('parking-live'));
  return io;
};

export const emitSlotUpdate = (slot) => io?.to('parking-live').emit('slot:updated', slot);
