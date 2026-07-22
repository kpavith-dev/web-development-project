import { Server } from 'socket.io';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] } });
  io.on('connection', (socket) => socket.join('parking-live'));
  return io;
};

export const emitSlotUpdate = (slot) => io?.to('parking-live').emit('slot:updated', slot);
