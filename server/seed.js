import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ParkingArea from './models/ParkingArea.js';
import ParkingSlot from './models/ParkingSlot.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});
  await ParkingArea.deleteMany({});
  await ParkingSlot.deleteMany({});

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  await User.create({ name: 'Admin User', email: 'admin@campus.com', password: adminPassword, role: 'admin' });
  await User.create({ name: 'Security Officer', email: 'security@campus.com', password: adminPassword, role: 'security' });

  const areaA = await ParkingArea.create({ name: 'Zone A', description: 'Student parking', totalSlots: 40, availableSlots: 30, reservedSlots: 8, occupiedSlots: 2 });
  const areaB = await ParkingArea.create({ name: 'Zone B', description: 'Staff parking', totalSlots: 25, availableSlots: 15, reservedSlots: 5, occupiedSlots: 5 });

  for (let i = 1; i <= 6; i += 1) {
    await ParkingSlot.create({ slotNumber: `A${String(i).padStart(2, '0')}`, parkingArea: areaA._id, status: i % 2 === 0 ? 'reserved' : 'available', vehicleTypeAllowed: 'car' });
  }

  for (let i = 1; i <= 4; i += 1) {
    await ParkingSlot.create({ slotNumber: `B${String(i).padStart(2, '0')}`, parkingArea: areaB._id, status: 'available', vehicleTypeAllowed: 'ev' });
  }

  console.log('Seed data created');
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
