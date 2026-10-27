import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import bcrypt from '../../server/node_modules/bcryptjs/index.js';
import jwt from '../../server/node_modules/jsonwebtoken/index.js';
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
import SecurityLog from '../../server/models/SecurityLog.js';
import Feedback from '../../server/models/Feedback.js';
import Notification from '../../server/models/Notification.js';
import mongoose from '../../server/node_modules/mongoose/index.js';
import { signParkingPass, generateParkingPassQr } from '../../server/controllers/reservationController.js';
import { syncSlotStatus } from '../../server/services/slotStatus.js';
import {
  campusDateBounds,
  campusDateKey,
  campusTime,
  campusDateTime
} from '../../server/utils/campusTime.js';

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

test.describe.serial('Isolated QR Verification, Check-in, Check-out and Feedback E2E Tests', () => {
  // Unique run identifier ensures complete test run isolation
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const testStudent = {
    name: `QR Test Student ${runId}`,
    email: `student_qr_${runId}@campus-test.local`,
    password: `ValidStudentPass123!`,
    role: 'student'
  };

  const testStudent2 = {
    name: `QR Secondary Student ${runId}`,
    email: `student2_qr_${runId}@campus-test.local`,
    password: `ValidStudentPass123!`,
    role: 'student'
  };

  const testSecurity = {
    name: `QR Security Officer ${runId}`,
    email: `security_qr_${runId}@campus-test.local`,
    password: `ValidSecurityPass123!`,
    role: 'security'
  };

  const testVehicleNumber = `QR-${runId.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()}`;

  // Strict tracking of created records for targeted cleanup
  const createdUserIds = [];
  const createdVehicleIds = [];
  const createdReservationIds = [];
  const createdReservationCodes = [];
  const createdFeedbackIds = [];

  let testStudentToken = '';
  let testStudentUser = null;
  let testStudentId = '';

  let testStudent2Token = '';
  let testStudent2User = null;

  let testSecurityToken = '';
  let testSecurityUser = null;
  let testSecurityId = '';

  let testVehicleId = '';
  let availableSlotId = '';
  let availableSlotNumber = '';

  let initialUserCount = 0;
  let initialVehicleCount = 0;
  let initialReservationCount = 0;
  let initialFeedbackCount = 0;

  let testEnvConfig = {};

  // Shared references between serial tests
  let resId1 = '';
  let resCode1 = '';
  let qrPass1 = '';

  let todayResDoc = null;
  let todayReservationCode = '';
  let qrPassToday = '';

  test.beforeAll(async () => {
    // 1. Mandatory Database Safety Guard: Verify NODE_ENV is strictly 'test'
    testEnvConfig = loadServerTestEnv();
    if (testEnvConfig.NODE_ENV !== 'test') {
      throw new Error(
        `[Database Safety Guard] Refusing to run stateful tests: NODE_ENV is "${testEnvConfig.NODE_ENV}". Expected "test".`
      );
    }
    process.env.JWT_SECRET = testEnvConfig.JWT_SECRET;

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

    // 3. Mandatory Database Safety Guard: Confirm backend is dedicated E2E harness and reports connected database
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
    initialFeedbackCount = await Feedback.countDocuments();

    // 6. Create dedicated test users safely
    // Student 1
    const hashedStudentPassword = await bcrypt.hash(testStudent.password, 10);
    const dbStudent = await User.create({
      name: testStudent.name,
      email: testStudent.email.toLowerCase(),
      password: hashedStudentPassword,
      role: 'student'
    });
    testStudentId = dbStudent._id.toString();
    createdUserIds.push(dbStudent._id);
    testStudentToken = jwt.sign({ id: dbStudent._id }, testEnvConfig.JWT_SECRET, { expiresIn: '7d' });
    testStudentUser = {
      id: dbStudent._id.toString(),
      name: dbStudent.name,
      email: dbStudent.email,
      role: dbStudent.role
    };

    // Student 2 (for authorization boundary testing)
    const dbStudent2 = await User.create({
      name: testStudent2.name,
      email: testStudent2.email.toLowerCase(),
      password: hashedStudentPassword,
      role: 'student'
    });
    createdUserIds.push(dbStudent2._id);
    testStudent2Token = jwt.sign({ id: dbStudent2._id }, testEnvConfig.JWT_SECRET, { expiresIn: '7d' });
    testStudent2User = {
      id: dbStudent2._id.toString(),
      name: dbStudent2.name,
      email: dbStudent2.email,
      role: dbStudent2.role
    };

    // Security user
    const hashedSecurityPassword = await bcrypt.hash(testSecurity.password, 10);
    const dbSecurity = await User.create({
      name: testSecurity.name,
      email: testSecurity.email.toLowerCase(),
      password: hashedSecurityPassword,
      role: 'security'
    });
    testSecurityId = dbSecurity._id.toString();
    createdUserIds.push(dbSecurity._id);
    testSecurityToken = jwt.sign({ id: dbSecurity._id }, testEnvConfig.JWT_SECRET, { expiresIn: '7d' });
    testSecurityUser = {
      id: dbSecurity._id.toString(),
      name: dbSecurity.name,
      email: dbSecurity.email,
      role: dbSecurity.role
    };

    // Pre-create verified active vehicle for student 1
    const dbVehicle = await Vehicle.create({
      user: dbStudent._id,
      vehicleNumber: testVehicleNumber,
      vehicleType: 'car',
      verificationStatus: 'verified',
      isPrimary: true,
      isActive: true,
      verifiedBy: dbSecurity._id,
      verifiedAt: new Date()
    });
    testVehicleId = dbVehicle._id.toString();
    createdVehicleIds.push(dbVehicle._id);
  });

  test.afterAll(async () => {
    // Narrow cleanup: Delete strictly the test fixtures created during this run in dependency order
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        assertSafeTestConnection(mongoose.connection);

        // 1. Delete created feedbacks
        if (createdReservationIds.length > 0 || createdFeedbackIds.length > 0) {
          await Feedback.deleteMany({
            $or: [
              { _id: { $in: createdFeedbackIds } },
              { reservation: { $in: createdReservationIds } }
            ]
          });
        }

        // 2. Delete created security logs
        if (createdReservationCodes.length > 0) {
          await SecurityLog.deleteMany({ reservationId: { $in: createdReservationCodes } });
        }

        // 3. Delete created reservations
        if (createdReservationIds.length > 0) {
          await Reservation.deleteMany({ _id: { $in: createdReservationIds } });
        }

        // 4. Delete notifications generated for created test users
        if (createdUserIds.length > 0) {
          await Notification.deleteMany({ user: { $in: createdUserIds } });
        }

        // 5. Delete created vehicles
        if (createdVehicleIds.length > 0) {
          await Vehicle.deleteMany({ _id: { $in: createdVehicleIds } });
        }

        // 6. Delete created test users
        if (createdUserIds.length > 0) {
          await User.deleteMany({ _id: { $in: createdUserIds } });
        }

        // 7. Restore parking slot status
        if (availableSlotId) {
          await syncSlotStatus(availableSlotId);
        }

        // 8. Assert baseline fixture counts are restored
        const finalUserCount = await User.countDocuments();
        const finalVehicleCount = await Vehicle.countDocuments();
        const finalReservationCount = await Reservation.countDocuments();
        const finalFeedbackCount = await Feedback.countDocuments();

        expect(finalUserCount).toBe(initialUserCount);
        expect(finalVehicleCount).toBe(initialVehicleCount);
        expect(finalReservationCount).toBe(initialReservationCount);
        expect(finalFeedbackCount).toBe(initialFeedbackCount);
      }
    } catch (err) {
      console.error('[Database Cleanup Warning] Narrow cleanup encountered an error:', err.message);
    } finally {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  test('1. A valid reservation produces the expected QR pass in UI and database', async ({ page }) => {
    // Set student session
    await setSession(page, testStudentToken, testStudentUser);

    await page.goto('/reservations');
    await expect(page).toHaveURL(/\/reservations$/);

    // Open reservation form
    await page.getByRole('button', { name: 'New reservation' }).click();

    // Wait for vehicle options to load and select verified vehicle
    const vehicleSelect = page.locator('label', { hasText: 'Vehicle' }).locator('..').locator('select');
    await expect(vehicleSelect).toBeVisible();
    await expect(vehicleSelect.locator(`option[value="${testVehicleId}"]`)).toBeAttached({ timeout: 10000 });
    await vehicleSelect.selectOption(testVehicleId);

    // Set reservation parameters for tomorrow (campus date)
    const tomorrowStr = campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const bookingDateInput = page.locator('input[type="date"]');
    await bookingDateInput.fill(tomorrowStr);

    // Select the available slot
    const slotSelect = page.locator('label', { hasText: 'Available slot' }).locator('..').locator('select');
    await expect(slotSelect).toBeVisible();
    await expect(slotSelect.locator(`option[value="${availableSlotId}"]`)).toBeAttached({ timeout: 10000 });
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
    expect(reservationBody.data.reservationId).toBeTruthy();

    resId1 = reservationBody.data._id;
    resCode1 = reservationBody.data.reservationId;
    createdReservationIds.push(new mongoose.Types.ObjectId(resId1));
    createdReservationCodes.push(resCode1);

    // Toast feedback appears in UI
    await expect(page.locator('.Toastify__toast', { hasText: 'Reservation created successfully.' })).toBeVisible();

    // Verify reservation appears in "My reservations" section with QR code image
    const reservationCard = page.locator('article', { hasText: resCode1 });
    await expect(reservationCard).toBeVisible();
    await expect(reservationCard.getByText(testVehicleNumber)).toBeVisible();
    await expect(reservationCard.getByText(availableSlotNumber)).toBeVisible();
    await expect(reservationCard.locator('img[alt="Reservation QR"]')).toBeVisible();

    // QR image src must be a base64 Data URL
    const qrImageSrc = await reservationCard.locator('img[alt="Reservation QR"]').getAttribute('src');
    expect(qrImageSrc).toMatch(/^data:image\/png;base64,/);

    // Verify database document
    const dbReservation = await Reservation.findById(resId1);
    expect(dbReservation).not.toBeNull();
    expect(dbReservation.reservationId).toBe(resCode1);
    expect(dbReservation.qrCode).toBe(qrImageSrc);
    expect(dbReservation.status).toBe('pending');
    expect(dbReservation.user.toString()).toBe(testStudentId);

    // Generate signed QR pass payload and verify structure
    qrPass1 = signParkingPass({
      reservationId: resCode1,
      userId: testStudentId,
      slotId: availableSlotId,
      vehicleId: testVehicleId
    });

    const decoded = jwt.verify(qrPass1, testEnvConfig.JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.type).toBe('parking-pass');
    expect(decoded.reservationId).toBe(resCode1);
    expect(decoded.userId).toBe(testStudentId);
    expect(decoded.slotId).toBe(availableSlotId);
    expect(decoded.vehicleId).toBe(testVehicleId);
  });

  test('2. An authorized security user can verify the pass using the real supported workflow', async ({ page }) => {
    // Set security officer session
    await setSession(page, testSecurityToken, testSecurityUser);

    await page.goto('/security');
    await expect(page).toHaveURL(/\/security$/);
    await expect(page.getByRole('heading', { name: 'Entry & exit verification', level: 1 })).toBeVisible();

    // Fill signed QR pass data into input
    const passInput = page.getByPlaceholder('e.g. RES-... or scan QR pass');
    await expect(passInput).toBeVisible();
    await passInput.fill(qrPass1);

    // Verify pass via UI
    const verifyButton = page.getByRole('button', { name: 'Verify pass' });
    const [verifyResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/verify') && res.request().method() === 'POST'),
      verifyButton.click()
    ]);

    expect(verifyResponse.status()).toBe(200);
    const verifyBody = await verifyResponse.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.message).toBe('Parking pass verified.');
    expect(verifyBody.data.reservationId).toBe(resCode1);

    // Verify details rendered in the verified reservation card
    await expect(page.getByText('Verified reservation')).toBeVisible();
    await expect(page.getByText(resCode1)).toBeVisible();
    await expect(page.getByText(testStudent.name)).toBeVisible();
    await expect(page.getByText(testVehicleNumber)).toBeVisible();
    await expect(page.getByText('Current status: pending')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve entry' })).toBeVisible();

    // Verify API supports reservation reference directly
    const verifyByRefRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: resCode1 })
    });
    expect(verifyByRefRes.status).toBe(200);
    const verifyByRefBody = await verifyByRefRes.json();
    expect(verifyByRefBody.success).toBe(true);
    expect(verifyByRefBody.data.reservationId).toBe(resCode1);
  });

  test('3. Invalid, malformed, expired, or otherwise unauthorized QR passes are rejected according to business rules', async ({ page }) => {
    // Set security officer session for UI negative check
    await setSession(page, testSecurityToken, testSecurityUser);
    await page.goto('/security');
    await expect(page).toHaveURL(/\/security$/);

    const passInput = page.getByPlaceholder('e.g. RES-... or scan QR pass');
    const verifyButton = page.getByRole('button', { name: 'Verify pass' });

    // UI Check: Invalid reservation reference
    await passInput.fill('RES-INVALID-NONEXISTENT-999');
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/verify') && res.request().method() === 'POST'),
      verifyButton.click()
    ]);
    await expect(page.locator('.Toastify__toast', { hasText: /Verification failed|Reservation not found/i })).toBeVisible();
    await expect(page.getByText('Verified reservation')).not.toBeVisible();

    // API Negative Checks:
    // A. Malformed token string
    const malformedRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ qrData: 'malformed.qr.token' })
    });
    expect(malformedRes.status).toBe(400);
    const malformedBody = await malformedRes.json();
    expect(malformedBody.message).toBe('Invalid or expired parking pass.');

    // B. Token signed with wrong secret key
    const wrongSecretToken = jwt.sign(
      { reservationId: resCode1, userId: testStudentId, type: 'parking-pass' },
      'wrong-secret-key-that-does-not-match-jwt-secret!!',
      { algorithm: 'HS256' }
    );
    const wrongSecretRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ qrData: wrongSecretToken })
    });
    expect(wrongSecretRes.status).toBe(400);
    const wrongSecretBody = await wrongSecretRes.json();
    expect(wrongSecretBody.message).toBe('Invalid or expired parking pass.');

    // C. Expired token (expiresIn: -1s)
    const expiredToken = jwt.sign(
      { reservationId: resCode1, userId: testStudentId, type: 'parking-pass' },
      testEnvConfig.JWT_SECRET,
      { expiresIn: '-1s', algorithm: 'HS256' }
    );
    const expiredRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ qrData: expiredToken })
    });
    expect(expiredRes.status).toBe(400);
    const expiredBody = await expiredRes.json();
    expect(expiredBody.message).toBe('Invalid or expired parking pass.');

    // D. Tampered type in payload
    const invalidTypeToken = jwt.sign(
      { reservationId: resCode1, userId: testStudentId, type: 'wrong-type' },
      testEnvConfig.JWT_SECRET,
      { algorithm: 'HS256' }
    );
    const invalidTypeRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ qrData: invalidTypeToken })
    });
    expect(invalidTypeRes.status).toBe(400);
    const invalidTypeBody = await invalidTypeRes.json();
    expect(invalidTypeBody.message).toBe('Invalid or expired parking pass.');

    // E. Tampered userId (mismatched user)
    const mismatchedUserToken = jwt.sign(
      { reservationId: resCode1, userId: testSecurityId, type: 'parking-pass' },
      testEnvConfig.JWT_SECRET,
      { algorithm: 'HS256' }
    );
    const mismatchedUserRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ qrData: mismatchedUserToken })
    });
    expect(mismatchedUserRes.status).toBe(400);
    const mismatchedUserBody = await mismatchedUserRes.json();
    expect(mismatchedUserBody.message).toBe('Invalid or expired parking pass.');

    // F. Both reservationId and qrData provided
    const bothRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: resCode1, qrData: qrPass1 })
    });
    expect(bothRes.status).toBe(400);
    const bothBody = await bothRes.json();
    expect(bothBody.message).toBe('Provide either a QR pass or a reservation reference, not both.');

    // G. Unauthorized user role (student trying to verify pass)
    const unauthorizedRoleRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ qrData: qrPass1 })
    });
    expect(unauthorizedRoleRes.status).toBe(403);

    // H. Unauthenticated request
    const unauthenticatedRes = await fetch('http://127.0.0.1:5000/api/security/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData: qrPass1 })
    });
    expect(unauthenticatedRes.status).toBe(401);
  });

  test('4. Check-in succeeds only when reservation status, user role, campus time, arrival time, and arrival window satisfy rules', async ({ page }) => {
    // Create a safe, deterministic today reservation fixture covering the active arrival window
    const now = new Date();
    const arrivalTime = campusTime(new Date(now.getTime() - 2 * 60 * 1000));
    const departureTime = '23:59';
    const bookingDate = campusDateBounds(now).date;
    todayReservationCode = `RES-TODAY-${runId}`;

    const generated = await generateParkingPassQr({
      reservationId: todayReservationCode,
      userId: testStudentId,
      slotId: availableSlotId,
      vehicleId: testVehicleId
    });
    qrPassToday = generated.qrData;

    const arrivalDt = campusDateTime(bookingDate, arrivalTime);
    const expiresAt = new Date(arrivalDt.getTime() + 15 * 60 * 1000);

    todayResDoc = await Reservation.create({
      slot: availableSlotId,
      vehicle: testVehicleId,
      bookingDate,
      arrivalTime,
      departureTime,
      user: testStudentId,
      reservationId: todayReservationCode,
      qrCode: generated.qrCode,
      expiresAt,
      status: 'confirmed'
    });
    createdReservationIds.push(todayResDoc._id);
    createdReservationCodes.push(todayReservationCode);

    // Set security session and verify pass via UI
    await setSession(page, testSecurityToken, testSecurityUser);
    await page.goto('/security');
    await expect(page).toHaveURL(/\/security$/);

    const passInput = page.getByPlaceholder('e.g. RES-... or scan QR pass');
    await passInput.fill(todayReservationCode);

    const verifyButton = page.getByRole('button', { name: 'Verify pass' });
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/verify') && res.request().method() === 'POST'),
      verifyButton.click()
    ]);

    // Check-in button is displayed
    const approveEntryButton = page.getByRole('button', { name: 'Approve entry' });
    await expect(approveEntryButton).toBeVisible();

    // Click Approve entry button in UI
    const [checkInResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/check-in') && res.request().method() === 'POST'),
      approveEntryButton.click()
    ]);

    expect(checkInResponse.status()).toBe(200);
    const checkInBody = await checkInResponse.json();
    expect(checkInBody.success).toBe(true);
    expect(checkInBody.message).toBe('Check-in approved.');
    expect(checkInBody.data.status).toBe('checked-in');

    // UI feedback toast and updated status
    await expect(page.locator('.Toastify__toast', { hasText: 'Check-in approved.' })).toBeVisible();
    await expect(page.getByText('Current status: checked-in')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve exit' })).toBeVisible();

    // Direct database assertions
    const dbRes = await Reservation.findById(todayResDoc._id);
    expect(dbRes.status).toBe('checked-in');
    expect(dbRes.checkedInAt).toBeTruthy();

    const secLog = await SecurityLog.findOne({ reservationId: todayReservationCode, action: 'check-in' });
    expect(secLog).not.toBeNull();
    expect(secLog.officer.toString()).toBe(testSecurityId);

    const notif = await Notification.findOne({ user: testStudentId, type: 'reservation-check-in' });
    expect(notif).not.toBeNull();
    expect(notif.title).toBe('Parking check-in completed');

    const dbSlot = await ParkingSlot.findById(availableSlotId);
    expect(dbSlot.status).toBe('occupied');

    // Role check: unauthorized student role rejected
    const studentCheckInRes = await fetch('http://127.0.0.1:5000/api/security/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservationId: todayReservationCode })
    });
    expect(studentCheckInRes.status).toBe(403);
  });

  test('5. Duplicate or premature check-in is rejected', async () => {
    // A. Premature check-in rejected: resCode1 is booked for tomorrow
    const prematureRes = await fetch('http://127.0.0.1:5000/api/security/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: resCode1 })
    });
    expect(prematureRes.status).toBe(400);
    const prematureBody = await prematureRes.json();
    expect(prematureBody.success).toBe(false);
    expect(prematureBody.message).toBe('Check-in is only available during the reservation arrival window.');

    // Status remains unchanged
    const pendingDbRes = await Reservation.findById(resId1);
    expect(pendingDbRes.status).toBe('pending');

    // B. Duplicate check-in rejected: todayReservationCode is already checked-in
    const duplicateRes = await fetch('http://127.0.0.1:5000/api/security/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: todayReservationCode })
    });
    expect(duplicateRes.status).toBe(400);
    const duplicateBody = await duplicateRes.json();
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toBe('Reservation is not eligible for check-in.');
  });

  test('6. Check-out succeeds only after a valid check-in and follows actual time and status rules', async ({ page }) => {
    // Set security session
    await setSession(page, testSecurityToken, testSecurityUser);

    await page.goto('/security');
    await expect(page).toHaveURL(/\/security$/);

    // Verify checked-in pass
    const passInput = page.getByPlaceholder('e.g. RES-... or scan QR pass');
    await passInput.fill(todayReservationCode);

    const verifyButton = page.getByRole('button', { name: 'Verify pass' });
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/verify') && res.request().method() === 'POST'),
      verifyButton.click()
    ]);

    await expect(page.getByText('Current status: checked-in')).toBeVisible();

    // Click Approve exit button in UI
    const approveExitButton = page.getByRole('button', { name: 'Approve exit' });
    await expect(approveExitButton).toBeVisible();

    const [checkOutResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/security/check-out') && res.request().method() === 'POST'),
      approveExitButton.click()
    ]);

    expect(checkOutResponse.status()).toBe(200);
    const checkOutBody = await checkOutResponse.json();
    expect(checkOutBody.success).toBe(true);
    expect(checkOutBody.message).toBe('Check-out approved.');
    expect(checkOutBody.data.status).toBe('checked-out');

    // UI feedback toast and updated status
    await expect(page.locator('.Toastify__toast', { hasText: 'Check-out approved.' })).toBeVisible();
    await expect(page.getByText('Current status: checked-out')).toBeVisible();

    // Direct database assertions
    const dbRes = await Reservation.findById(todayResDoc._id);
    expect(dbRes.status).toBe('checked-out');
    expect(dbRes.checkedOutAt).toBeTruthy();

    const secOutLog = await SecurityLog.findOne({ reservationId: todayReservationCode, action: 'check-out' });
    expect(secOutLog).not.toBeNull();
    expect(secOutLog.officer.toString()).toBe(testSecurityId);

    const outNotif = await Notification.findOne({ user: testStudentId, type: 'reservation-check-out' });
    expect(outNotif).not.toBeNull();
    expect(outNotif.title).toBe('Parking check-out completed');

    // Slot status resets from occupied to available
    const dbSlotAfter = await ParkingSlot.findById(availableSlotId);
    expect(dbSlotAfter.status).toBe('available');
  });

  test('7. Duplicate or invalid check-out is rejected', async () => {
    // A. Check-out on pending reservation (never checked-in)
    const prematureCheckOutRes = await fetch('http://127.0.0.1:5000/api/security/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: resCode1 })
    });
    expect(prematureCheckOutRes.status).toBe(400);
    const prematureBody = await prematureCheckOutRes.json();
    expect(prematureBody.success).toBe(false);
    expect(prematureBody.message).toBe('Reservation has not been checked in.');

    // B. Duplicate check-out on already checked-out reservation
    const duplicateCheckOutRes = await fetch('http://127.0.0.1:5000/api/security/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: todayReservationCode })
    });
    expect(duplicateCheckOutRes.status).toBe(400);
    const duplicateBody = await duplicateCheckOutRes.json();
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toBe('Invalid or expired parking pass.');

    // C. Nonexistent reservation ID
    const notFoundRes = await fetch('http://127.0.0.1:5000/api/security/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testSecurityToken}`
      },
      body: JSON.stringify({ reservationId: 'RES-NONEXISTENT-CHECKOUT-999' })
    });
    expect(notFoundRes.status).toBe(404);
    const notFoundBody = await notFoundRes.json();
    expect(notFoundBody.message).toBe('Reservation not found.');

    // D. Unauthorized student role
    const studentCheckOutRes = await fetch('http://127.0.0.1:5000/api/security/check-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservationId: todayReservationCode })
    });
    expect(studentCheckOutRes.status).toBe(403);
  });

  test('8. Feedback can be submitted only when reservation meets eligibility rules; invalid or duplicate feedback is rejected', async ({ page }) => {
    // API Negative Checks:
    // A. Feedback on pending reservation (not checked-out) rejected (403)
    const pendingFeedbackRes = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservation: resId1, rating: 5, comment: 'Too early' })
    });
    expect(pendingFeedbackRes.status).toBe(403);
    const pendingBody = await pendingFeedbackRes.json();
    expect(pendingBody.message).toBe('Feedback is available only for your completed reservations');

    // B. Feedback by another student on this completed reservation rejected (403)
    const otherUserFeedbackRes = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudent2Token}`
      },
      body: JSON.stringify({ reservation: todayResDoc._id.toString(), rating: 5, comment: 'Not my booking' })
    });
    expect(otherUserFeedbackRes.status).toBe(403);
    const otherUserBody = await otherUserFeedbackRes.json();
    expect(otherUserBody.message).toBe('Feedback is available only for your completed reservations');

    // C. Invalid rating (< 1 or > 5 or non-integer) rejected (400)
    const invalidRatingRes = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservation: todayResDoc._id.toString(), rating: 6, comment: 'Invalid rating' })
    });
    expect(invalidRatingRes.status).toBe(400);
    const invalidRatingBody = await invalidRatingRes.json();
    expect(invalidRatingBody.message).toBe('Rating must be between 1 and 5');

    // D. Comment exceeding 500 characters rejected (400)
    const longCommentRes = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservation: todayResDoc._id.toString(), rating: 5, comment: 'A'.repeat(501) })
    });
    expect(longCommentRes.status).toBe(400);
    const longCommentBody = await longCommentRes.json();
    expect(longCommentBody.message).toBe('Comment must be 500 characters or fewer');

    // UI Workflow: Student leaves feedback on completed reservation
    await setSession(page, testStudentToken, testStudentUser);
    await page.goto('/reservations');
    await expect(page).toHaveURL(/\/reservations$/);

    const completedCard = page.locator('article', { hasText: todayReservationCode });
    await expect(completedCard).toBeVisible();
    await expect(completedCard.getByText('checked-out')).toBeVisible();

    const leaveFeedbackButton = completedCard.getByRole('button', { name: 'Leave feedback' });
    await expect(leaveFeedbackButton).toBeVisible();
    await leaveFeedbackButton.click();

    // Feedback modal opens
    await expect(page.getByRole('heading', { name: `Feedback for ${todayReservationCode}` })).toBeVisible();

    // Select rating
    const ratingSelect = page.locator('form select');
    await ratingSelect.selectOption('5');

    // Enter comment
    const commentInput = page.locator('form textarea');
    await commentInput.fill('Seamless campus parking with fast security QR verification.');

    // Submit feedback
    const submitFeedbackButton = page.getByRole('button', { name: 'Submit feedback' });
    const [submitFeedbackResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/feedback') && res.request().method() === 'POST'),
      submitFeedbackButton.click()
    ]);

    expect(submitFeedbackResponse.status()).toBe(201);
    const feedbackBody = await submitFeedbackResponse.json();
    expect(feedbackBody.success).toBe(true);
    expect(feedbackBody.message).toBe('Thanks for your feedback');

    createdFeedbackIds.push(new mongoose.Types.ObjectId(feedbackBody.data._id));

    // Toast and updated card display
    await expect(page.locator('.Toastify__toast', { hasText: 'Thanks for your feedback.' })).toBeVisible();
    await expect(completedCard.getByText('Feedback submitted')).toBeVisible();

    // Direct database assertions
    const dbFeedback = await Feedback.findOne({ reservation: todayResDoc._id });
    expect(dbFeedback).not.toBeNull();
    expect(dbFeedback.user.toString()).toBe(testStudentId);
    expect(dbFeedback.rating).toBe(5);
    expect(dbFeedback.comment).toBe('Seamless campus parking with fast security QR verification.');

    // Duplicate feedback rejected (409 Conflict)
    const duplicateFeedbackRes = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testStudentToken}`
      },
      body: JSON.stringify({ reservation: todayResDoc._id.toString(), rating: 4, comment: 'Second attempt' })
    });
    expect(duplicateFeedbackRes.status).toBe(409);
    const duplicateFeedbackBody = await duplicateFeedbackRes.json();
    expect(duplicateFeedbackBody.message).toBe('Feedback has already been submitted for this reservation');
  });
});
