import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import bcrypt from '../../server/node_modules/bcryptjs/index.js';
import {
  validateE2EEnvironment,
  assertSafeE2EConnection,
  REQUIRED_E2E_DB_NAME,
  REQUIRED_E2E_PORT,
  FORBIDDEN_DEV_PORT
} from '../../server/e2eHarness.js';
import {
  connectTestDatabase,
  assertSafeTestConnection
} from '../../server/test/testDbGuard.js';
import User from '../../server/models/User.js';
import Vehicle from '../../server/models/Vehicle.js';
import ParkingSlot from '../../server/models/ParkingSlot.js';
import ParkingArea from '../../server/models/ParkingArea.js';
import Reservation from '../../server/models/Reservation.js';
import Notification from '../../server/models/Notification.js';
import mongoose from '../../server/node_modules/mongoose/index.js';
import { campusDateKey } from '../../server/utils/campusTime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads server/.env.test safely without external dependencies.
 */
function loadServerTestEnv() {
  const envPath = path.resolve(__dirname, '../../server/.env.test');
  if (!fs.existsSync(envPath)) {
    throw new Error(`[Database Safety Guard] Missing .env.test file at ${envPath}`);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      parsed[key] = val;
    }
  }
  return parsed;
}

/**
 * Injects authenticated session credentials into page localStorage before scripts execute.
 */
async function setSession(page, token, user) {
  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem('parking_token', t);
      localStorage.setItem('parking_user', JSON.stringify(u));
    },
    [token, user]
  );
}

test.describe.serial('Isolated Vehicle Approval and Reservation E2E Tests', () => {
  // Unique run identifier ensures complete test run isolation
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const testStudent = {
    name: `E2E Student ${runId}`,
    email: `student_veh_${runId}@campus-test.local`,
    password: `ValidStudentPass123!`,
    role: 'student'
  };

  const testAdmin = {
    name: `E2E Admin ${runId}`,
    email: `admin_veh_${runId}@campus-test.local`,
    password: `ValidAdminPass123!`,
    role: 'admin'
  };

  const testVehicleNumber = `VEH-${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
  const testRegNumber = `REG-${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()}`;

  // Strict tracking of created records for targeted cleanup
  const createdUserIds = [];
  const createdVehicleIds = [];
  const createdReservationIds = [];

  let testStudentToken = '';
  let testStudentUser = null;
  let testStudentId = '';
  let testVehicleId = '';
  let availableSlotId = '';
  let availableSlotNumber = '';

  let initialUserCount = 0;
  let initialVehicleCount = 0;
  let initialReservationCount = 0;

  test.beforeAll(async () => {
    // 1. Mandatory Database Safety Guard: Verify NODE_ENV is strictly 'test'
    const testEnvConfig = loadServerTestEnv();
    if (testEnvConfig.NODE_ENV !== 'test') {
      throw new Error(
        `[Database Safety Guard] Refusing to run stateful tests: NODE_ENV is "${testEnvConfig.NODE_ENV}". Expected "test".`
      );
    }

    // 2. Mandatory Database Safety Guard: Verify dedicated E2E environment & URI constraints
    const validated = validateE2EEnvironment({
      nodeEnv: testEnvConfig.NODE_ENV,
      testUri: testEnvConfig.MONGO_TEST_URI
    });

    if (validated.port === FORBIDDEN_DEV_PORT || validated.uri.includes(`:${FORBIDDEN_DEV_PORT}`)) {
      throw new Error(
        `[Database Safety Guard] Refusing to run: Target URI uses forbidden development port ${FORBIDDEN_DEV_PORT}.`
      );
    }

    if (validated.dbName !== REQUIRED_E2E_DB_NAME) {
      throw new Error(
        `[Database Safety Guard] Refusing to run: Target DB is "${validated.dbName}". Expected strictly "${REQUIRED_E2E_DB_NAME}".`
      );
    }

    // 3. Mandatory Database Safety Guard: Confirm backend is the dedicated E2E harness and reports connected database
    try {
      const healthRes = await fetch('http://127.0.0.1:5000/api/health');
      if (!healthRes.ok) {
        throw new Error(`Health endpoint returned HTTP ${healthRes.status}`);
      }
      const healthData = await healthRes.json();
      if (healthData.service !== 'smart-campus-parking-server' || healthData.database !== 'connected') {
        throw new Error(`Backend reports service "${healthData.service}", database "${healthData.database}".`);
      }
    } catch (err) {
      throw new Error(
        `[Database Safety Guard] Dedicated E2E backend on http://127.0.0.1:5000 is unavailable: ${err.message}`
      );
    }

    // 4. Mandatory Database Safety Guard: Connect Mongoose directly to verified test DB for scoped verification & cleanup
    await connectTestDatabase(testEnvConfig.MONGO_TEST_URI);
    const activeDbName = assertSafeE2EConnection(mongoose.connection);
    if (activeDbName !== REQUIRED_E2E_DB_NAME) {
      await mongoose.disconnect();
      throw new Error(
        `[Database Safety Guard] Connected DB "${activeDbName}" does not match required "${REQUIRED_E2E_DB_NAME}".`
      );
    }

    // 5. Verify required active parking area and active slot exist
    const activeArea = await ParkingArea.findOne({ isActive: true });
    if (!activeArea) {
      throw new Error('[Database Safety Guard] Missing active parking area fixture in test database.');
    }

    const activeSlot = await ParkingSlot.findOne({
      parkingArea: activeArea._id,
      isActive: true,
      vehicleTypeAllowed: 'car',
      status: { $ne: 'maintenance' }
    });
    if (!activeSlot) {
      throw new Error('[Database Safety Guard] Missing active car parking slot fixture in test database.');
    }
    availableSlotId = activeSlot._id.toString();
    availableSlotNumber = activeSlot.slotNumber;

    // Record baseline fixture counts for non-destructive verification
    initialUserCount = await User.countDocuments();
    initialVehicleCount = await Vehicle.countDocuments();
    initialReservationCount = await Reservation.countDocuments();

    // 6. Create dedicated test admin directly with bcrypt hash (since public registration cannot register admin accounts)
    const hashedAdminPassword = await bcrypt.hash(testAdmin.password, 10);
    const dbAdmin = await User.create({
      name: testAdmin.name,
      email: testAdmin.email.toLowerCase(),
      password: hashedAdminPassword,
      role: 'admin'
    });
    createdUserIds.push(dbAdmin._id);
  });

  test.afterAll(async () => {
    // Step 4 Cleanup: Delete strictly the test fixtures created during this run in reverse dependency order
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        assertSafeTestConnection(mongoose.connection);

        // 1. Delete created reservations
        if (createdReservationIds.length > 0) {
          await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
        }

        // 2. Delete notifications generated for created test users
        if (createdUserIds.length > 0) {
          await Notification.deleteMany({ user: { $in: createdUserIds } });
        }

        // 3. Delete created vehicles
        if (createdVehicleIds.length > 0) {
          await Vehicle.deleteMany({ _id: { $in: createdVehicleIds } });
        }

        // 4. Delete created users
        if (createdUserIds.length > 0) {
          await User.deleteMany({ _id: { $in: createdUserIds } });
        }

        // Verify fixture counts returned to initial baseline
        const finalUserCount = await User.countDocuments();
        const finalVehicleCount = await Vehicle.countDocuments();
        const finalReservationCount = await Reservation.countDocuments();

        expect(finalUserCount).toBe(initialUserCount);
        expect(finalVehicleCount).toBe(initialVehicleCount);
        expect(finalReservationCount).toBe(initialReservationCount);
      }
    } catch (err) {
      console.error('[Database Cleanup Warning] Narrow cleanup encountered an error:', err.message);
    } finally {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  test('1. Register test student through actual UI, verify authentication and role boundaries', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create Account', level: 1 })).toBeVisible();

    const nameInput = page.getByPlaceholder('Full Name');
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password (minimum 6 characters)');
    const roleSelect = page.locator('select');
    const registerButton = page.getByRole('button', { name: 'Register' });

    await nameInput.fill(testStudent.name);
    await emailInput.fill(testStudent.email);
    await passwordInput.fill(testStudent.password);
    await roleSelect.selectOption('student');

    const [registerResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST'),
      registerButton.click()
    ]);

    expect(registerResponse.status()).toBe(201);
    const registerBody = await registerResponse.json();
    expect(registerBody.success).toBe(true);
    expect(registerBody.data?.token).toBeTruthy();

    testStudentToken = registerBody.data.token;
    testStudentUser = registerBody.data.user;
    testStudentId = registerBody.data.user.id;
    createdUserIds.push(new mongoose.Types.ObjectId(testStudentId));

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Signed in as')).toBeVisible();

    // Verify student is restricted from privileged admin vehicles page
    await expect(page.getByRole('link', { name: 'Vehicles' })).toHaveCount(0);

    // Attempting direct URL navigation to /vehicles redirects student away
    await page.goto('/vehicles');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('2. Add vehicle through student profile UI and verify initial pending verification status', async ({ page }) => {
    // Set student session
    await setSession(page, testStudentToken, testStudentUser);

    // Navigate to student's profile page
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'My vehicles', level: 2 })).toBeVisible();

    const vehicleNumberInput = page.getByPlaceholder('Vehicle number');
    const vehicleTypeSelect = page.locator('section').filter({ hasText: 'My vehicles' }).locator('select');
    const vehicleBrandInput = page.getByPlaceholder('Vehicle brand');
    const registrationNumberInput = page.getByPlaceholder('Registration number');
    const modelInput = page.getByPlaceholder('Model');
    const colorInput = page.getByPlaceholder('Color');
    const addVehicleButton = page.getByRole('button', { name: /Add vehicle/i });

    // Fill valid vehicle information
    await vehicleNumberInput.fill(testVehicleNumber);
    await vehicleTypeSelect.selectOption('car');
    await vehicleBrandInput.fill('Toyota');
    await registrationNumberInput.fill(testRegNumber);
    await modelInput.fill('Corolla');
    await colorInput.fill('Silver');

    const [createVehicleResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/vehicles') && res.request().method() === 'POST'),
      addVehicleButton.click()
    ]);

    expect(createVehicleResponse.status()).toBe(201);
    const vehicleBody = await createVehicleResponse.json();
    expect(vehicleBody.success).toBe(true);
    expect(vehicleBody.data.vehicleNumber).toBe(testVehicleNumber.toUpperCase());
    expect(vehicleBody.data.verificationStatus).toBe('pending');
    expect(vehicleBody.data.isPrimary).toBe(true);

    testVehicleId = vehicleBody.data._id;
    createdVehicleIds.push(new mongoose.Types.ObjectId(testVehicleId));

    // Toast feedback appears in UI
    await expect(page.locator('.Toastify__toast', { hasText: 'Vehicle added for verification.' })).toBeVisible();

    // Verify vehicle card appears in UI with initial pending status
    const vehicleCard = page.locator('div', { hasText: testVehicleNumber }).first();
    await expect(vehicleCard).toBeVisible();
    await expect(vehicleCard.locator('p', { hasText: 'pending' })).toBeVisible();
    await expect(vehicleCard.getByText('★ Primary')).toBeVisible();

    // Direct isolated database verification
    const dbVehicle = await Vehicle.findById(testVehicleId);
    expect(dbVehicle).not.toBeNull();
    expect(dbVehicle.vehicleNumber).toBe(testVehicleNumber.toUpperCase());
    expect(dbVehicle.verificationStatus).toBe('pending');
    expect(dbVehicle.isActive).toBe(true);
  });

  test('3. Verify unapproved vehicle is not eligible for reservations in UI and rejected by backend', async ({ page }) => {
    // Set student session
    await setSession(page, testStudentToken, testStudentUser);

    await page.goto('/reservations');
    await expect(page).toHaveURL(/\/reservations$/);

    const newReservationButton = page.getByRole('button', { name: 'New reservation' });
    await newReservationButton.click();

    // Verify unapproved vehicle is excluded from the vehicle selection dropdown
    const vehicleSelect = page.locator('label', { hasText: 'Vehicle' }).locator('..').locator('select');
    await expect(vehicleSelect).toBeVisible();
    await expect(vehicleSelect.locator('option')).toHaveText('No verified active vehicle available');

    // Verify amber guidance banner directs student to verify vehicle first
    await expect(
      page.getByText('No eligible vehicle found. Please visit your Profile to add a vehicle and complete verification.')
    ).toBeVisible();

    // Verify backend enforces vehicle verification constraint (API negative check)
    const tomorrowStr = campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const attemptRes = await fetch('http://127.0.0.1:5000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        slot: availableSlotId,
        vehicle: testVehicleId,
        bookingDate: tomorrowStr,
        arrivalTime: '10:00',
        departureTime: '12:00'
      })
    });

    expect(attemptRes.status).toBe(400);
    const attemptBody = await attemptRes.json();
    expect(attemptBody.success).toBe(false);
    expect(attemptBody.message).toMatch(/not verified/i);

    // Confirm no reservation was persisted
    const resCount = await Reservation.countDocuments({ user: testStudentId });
    expect(resCount).toBe(0);
  });

  test('4. Log in as authorized admin and approve only the specific vehicle created by this test', async ({ page }) => {
    // Log in with test admin credentials through the UI
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(testAdmin.email);
    await page.getByPlaceholder('Password').fill(testAdmin.password);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      page.getByRole('button', { name: 'Sign In' }).click()
    ]);

    await expect(page).toHaveURL(/\/dashboard$/);

    // Navigate to admin vehicle verification page
    const vehiclesNavLink = page.getByRole('link', { name: 'Vehicles' });
    await expect(vehiclesNavLink).toBeVisible();
    await vehiclesNavLink.click();
    await expect(page).toHaveURL(/\/vehicles$/);
    await expect(page.getByRole('heading', { name: 'Vehicle verification', level: 1 })).toBeVisible();

    // Locate the specific vehicle row
    const targetRow = page.locator('tbody tr', { hasText: testVehicleNumber });
    await expect(targetRow).toBeVisible();
    await expect(targetRow.locator('span', { hasText: 'pending' })).toBeVisible();

    // Set up dialog handler for window.confirm
    page.once('dialog', (dialog) => dialog.accept());

    // Click Approve button only on target vehicle row
    const approveButton = targetRow.getByRole('button', { name: 'Approve' });
    const [verifyResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/vehicles/${testVehicleId}/verify`) && res.request().method() === 'PATCH'
      ),
      approveButton.click()
    ]);

    expect(verifyResponse.status()).toBe(200);
    const verifyBody = await verifyResponse.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.message).toBe('Vehicle approved');
    expect(verifyBody.data.verificationStatus).toBe('verified');

    // UI feedback toast appears
    await expect(page.locator('.Toastify__toast', { hasText: 'Vehicle approved.' })).toBeVisible();

    // Verify row updates to verified status badge
    await expect(targetRow.locator('span', { hasText: 'verified' })).toBeVisible();

    // Isolated database verification: vehicle is verified and notification recorded
    const updatedVehicle = await Vehicle.findById(testVehicleId);
    expect(updatedVehicle.verificationStatus).toBe('verified');
    expect(updatedVehicle.verifiedBy).toBeTruthy();
    expect(updatedVehicle.verifiedAt).toBeTruthy();

    const notif = await Notification.findOne({ user: testStudentId, type: 'vehicle-verified' });
    expect(notif).not.toBeNull();
    expect(notif.title).toBe('Vehicle approved');
  });

  test('5. Verify student vehicle status reflects approval in student UI', async ({ page }) => {
    // Set student session
    await setSession(page, testStudentToken, testStudentUser);

    // Navigate to student profile
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile$/);

    // Locate student's vehicle card
    const vehicleCard = page.locator('div', { hasText: testVehicleNumber }).first();
    await expect(vehicleCard).toBeVisible();

    // Verify verification status displays approval and reservation eligibility
    await expect(
      vehicleCard.getByText('verified · Eligible for reservations')
    ).toBeVisible();
  });

  test('6. View available parking slots and create reservation using the approved vehicle', async ({ page }) => {
    // Set student session
    await setSession(page, testStudentToken, testStudentUser);

    await page.goto('/reservations');
    await expect(page).toHaveURL(/\/reservations$/);

    // Open reservation form
    await page.getByRole('button', { name: 'New reservation' }).click();

    // Set reservation parameters for tomorrow (campus date)
    const tomorrowStr = campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const bookingDateInput = page.locator('input[type="date"]');
    await bookingDateInput.fill(tomorrowStr);

    // Select the approved vehicle and wait for slots to refresh
    const vehicleSelect = page.locator('label', { hasText: 'Vehicle' }).locator('..').locator('select');
    await expect(vehicleSelect).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/slots') && res.status() === 200),
      vehicleSelect.selectOption(testVehicleId)
    ]);

    // Select the available slot
    const slotSelect = page.locator('label', { hasText: 'Available slot' }).locator('..').locator('select');
    await expect(slotSelect).toBeVisible();
    await expect(slotSelect.locator(`option[value="${availableSlotId}"]`)).toBeAttached();
    await slotSelect.selectOption(availableSlotId);

    // Submit reservation
    const confirmButton = page.getByRole('button', { name: 'Confirm reservation' });
    const [createReservationRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/reservations') && res.request().method() === 'POST'),
      confirmButton.click()
    ]);

    expect(createReservationRes.status()).toBe(201);
    const reservationBody = await createReservationRes.json();
    expect(reservationBody.success).toBe(true);
    expect(reservationBody.message).toBe('Reservation created');
    expect(reservationBody.data.reservationId).toBeTruthy();

    const createdResId = reservationBody.data._id;
    const reservationCode = reservationBody.data.reservationId;
    createdReservationIds.push(new mongoose.Types.ObjectId(createdResId));

    // Toast feedback appears in UI
    await expect(page.locator('.Toastify__toast', { hasText: 'Reservation created successfully.' })).toBeVisible();

    // Verify reservation appears in "My reservations" section
    const reservationCard = page.locator('article', { hasText: reservationCode });
    await expect(reservationCard).toBeVisible();
    await expect(reservationCard.getByText(testVehicleNumber)).toBeVisible();
    await expect(reservationCard.getByText(availableSlotNumber)).toBeVisible();
    await expect(reservationCard.getByText('08:00 - 10:00')).toBeVisible();
    await expect(reservationCard.getByText('pending')).toBeVisible();
    await expect(reservationCard.locator('img[alt="Reservation QR"]')).toBeVisible();

    // Verify persistence in isolated test database
    const dbReservation = await Reservation.findById(createdResId);
    expect(dbReservation).not.toBeNull();
    expect(dbReservation.reservationId).toBe(reservationCode);
    expect(dbReservation.user.toString()).toBe(testStudentId);
    expect(dbReservation.vehicle.toString()).toBe(testVehicleId);
    expect(dbReservation.slot.toString()).toBe(availableSlotId);
    expect(dbReservation.status).toBe('pending');
    expect(dbReservation.qrCode).toBeTruthy();
  });

  test('7. Negative tests for invalid vehicle data and invalid reservation input', async () => {
    // 1. Negative vehicle tests
    // A. Invalid vehicle number format
    const invalidNumRes = await fetch('http://127.0.0.1:5000/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        vehicleNumber: '!!',
        vehicleType: 'car'
      })
    });
    expect(invalidNumRes.status).toBe(400);
    const invalidNumBody = await invalidNumRes.json();
    expect(invalidNumBody.message).toMatch(/valid vehicle number/i);

    // B. Invalid vehicle type
    const invalidTypeRes = await fetch('http://127.0.0.1:5000/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        vehicleNumber: 'VALID-999',
        vehicleType: 'airplane'
      })
    });
    expect(invalidTypeRes.status).toBe(400);
    const invalidTypeBody = await invalidTypeRes.json();
    expect(invalidTypeBody.message).toMatch(/invalid vehicle type/i);

    // C. Duplicate vehicle number for same user
    const duplicateVehicleRes = await fetch('http://127.0.0.1:5000/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        vehicleNumber: testVehicleNumber,
        vehicleType: 'car'
      })
    });
    expect(duplicateVehicleRes.status).toBe(409);
    const duplicateBody = await duplicateVehicleRes.json();
    expect(duplicateBody.message).toMatch(/already registered/i);

    // 2. Negative reservation tests
    const tomorrowStr = campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));

    // A. Departure time before or equal to arrival time
    const invalidTimesRes = await fetch('http://127.0.0.1:5000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        slot: availableSlotId,
        vehicle: testVehicleId,
        bookingDate: tomorrowStr,
        arrivalTime: '14:00',
        departureTime: '13:00'
      })
    });
    expect(invalidTimesRes.status).toBe(400);
    const invalidTimesBody = await invalidTimesRes.json();
    expect(invalidTimesBody.message).toMatch(/validation failed|must be after arrival time/i);

    // B. Past booking date
    const pastDateRes = await fetch('http://127.0.0.1:5000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        slot: availableSlotId,
        vehicle: testVehicleId,
        bookingDate: '2020-01-01',
        arrivalTime: '10:00',
        departureTime: '11:00'
      })
    });
    expect(pastDateRes.status).toBe(400);
    const pastDateBody = await pastDateRes.json();
    expect(pastDateBody.message).toMatch(/cannot be made in the past/i);

    // C. Overlapping reservation on the same slot
    const overlapRes = await fetch('http://127.0.0.1:5000/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({
        slot: availableSlotId,
        vehicle: testVehicleId,
        bookingDate: tomorrowStr,
        arrivalTime: '08:30',
        departureTime: '09:30'
      })
    });
    expect(overlapRes.status).toBe(409);
    const overlapBody = await overlapRes.json();
    expect(overlapBody.message).toMatch(/overlaps|already have an active reservation/i);
  });
});
