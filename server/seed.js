import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import ParkingArea from './models/ParkingArea.js';
import ParkingSlot from './models/ParkingSlot.js';
import Vehicle from './models/Vehicle.js';
import Reservation from './models/Reservation.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Reservation.deleteMany({});
  await Vehicle.deleteMany({});
  await User.deleteMany({});
  await ParkingArea.deleteMany({});
  await ParkingSlot.deleteMany({});

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await User.create({ name: 'Admin User', email: 'admin@campus.com', password: adminPassword, role: 'admin' });
  await User.create({ name: 'Security Officer', email: 'security@campus.com', password: adminPassword, role: 'security' });
  const student = await User.create({ name: 'Student User', email: 'student@campus.com', password: adminPassword, role: 'student', registrationNumber: 'STU-001' });

  const areaA = await ParkingArea.create({ name: 'Zone A', description: 'Student parking', totalSlots: 40, openingTime: '08:00', closingTime: '18:00', availableSlots: 3, reservedSlots: 3, occupiedSlots: 0, isActive: true });
  const areaB = await ParkingArea.create({ name: 'Zone B', description: 'Staff parking', totalSlots: 25, openingTime: '08:00', closingTime: '18:00', availableSlots: 4, reservedSlots: 0, occupiedSlots: 0, isActive: true });

  for (let i = 1; i <= 6; i += 1) {
    await ParkingSlot.create({ slotNumber: `A${String(i).padStart(2, '0')}`, parkingArea: areaA._id, status: i % 2 === 0 ? 'reserved' : 'available', vehicleTypeAllowed: 'car' });
  }

  for (let i = 1; i <= 4; i += 1) {
    await ParkingSlot.create({ slotNumber: `B${String(i).padStart(2, '0')}`, parkingArea: areaB._id, status: 'available', vehicleTypeAllowed: 'ev' });
  }

  await Vehicle.create({
    user: student._id,
    vehicleNumber: 'CAA-1234',
    vehicleType: 'car',
    vehicleBrand: 'Toyota',
    model: 'Corolla',
    color: 'Silver',
    registrationNumber: 'STU-001',
    isPrimary: true,
    isActive: true,
    verificationStatus: 'verified',
    verifiedBy: admin._id,
    verifiedAt: new Date()
  });

  console.log('Seed data created');
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
