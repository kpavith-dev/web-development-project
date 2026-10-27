import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
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
import mongoose from '../../server/node_modules/mongoose/index.js';

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

test.describe.serial('Isolated database-backed registration and login E2E tests', () => {
  // Generate unique test student credentials per test run
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const testStudent = {
    name: `E2E Test Student ${runId}`,
    email: `student_${runId}@campus-test.local`,
    password: `ValidStudentPass123!`,
    role: 'student'
  };

  const createdTestEmails = [];
  let initialUserCount = 0;
  let testEnvConfig = {};

  test.beforeAll(async () => {
    // Step 2 Guard 1: Verify NODE_ENV is strictly 'test'
    testEnvConfig = loadServerTestEnv();
    if (testEnvConfig.NODE_ENV !== 'test') {
      throw new Error(
        `[Database Safety Guard] Refusing to run stateful tests: NODE_ENV is "${testEnvConfig.NODE_ENV}". Expected "test".`
      );
    }

    // Step 2 Guard 2: Enforce dedicated E2E harness environment & URI constraints
    const validated = validateE2EEnvironment({
      nodeEnv: testEnvConfig.NODE_ENV,
      testUri: testEnvConfig.MONGO_TEST_URI
    });

    if (validated.port === FORBIDDEN_DEV_PORT || validated.uri.includes(`:${FORBIDDEN_DEV_PORT}`)) {
      throw new Error(
        `[Database Safety Guard] Refusing to run: URI targets forbidden development port ${FORBIDDEN_DEV_PORT}.`
      );
    }

    if (validated.dbName !== REQUIRED_E2E_DB_NAME) {
      throw new Error(
        `[Database Safety Guard] Refusing to run: Target DB is "${validated.dbName}". Expected strictly "${REQUIRED_E2E_DB_NAME}".`
      );
    }

    // Step 2 Guard 3: Confirm backend is the dedicated E2E harness and reports connected database
    try {
      const healthRes = await fetch('http://127.0.0.1:5000/api/health');
      if (!healthRes.ok) {
        throw new Error(`Health endpoint returned status HTTP ${healthRes.status}`);
      }
      const healthData = await healthRes.json();
      if (healthData.service !== 'smart-campus-parking-server' || healthData.database !== 'connected') {
        throw new Error(`Backend reports service "${healthData.service}", database "${healthData.database}".`);
      }
    } catch (err) {
      throw new Error(
        `[Database Safety Guard] Refusing to run: Dedicated E2E backend on http://127.0.0.1:5000 is unavailable: ${err.message}`
      );
    }

    // Step 2 Guard 4: Connect Mongoose directly to verified test DB for scoped cleanup and verification
    await connectTestDatabase(testEnvConfig.MONGO_TEST_URI);
    const activeDbName = assertSafeE2EConnection(mongoose.connection);
    if (activeDbName !== REQUIRED_E2E_DB_NAME) {
      await mongoose.disconnect();
      throw new Error(
        `[Database Safety Guard] Connected DB "${activeDbName}" does not match required "${REQUIRED_E2E_DB_NAME}".`
      );
    }

    // Record initial fixture count to ensure non-destructive isolation
    initialUserCount = await User.countDocuments();
  });

  test.afterAll(async () => {
    // Step 4: Strict narrow cleanup: delete ONLY the test student record created in this run
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        assertSafeTestConnection(mongoose.connection);
        if (createdTestEmails.length > 0) {
          const deleteResult = await User.deleteMany({ email: { $in: createdTestEmails } });
          const finalCount = await User.countDocuments();
          expect(finalCount).toBe(initialUserCount);
        }
      }
    } catch (err) {
      console.error('[Database Cleanup Warning] Narrow cleanup encountered an error:', err.message);
    } finally {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  test('1. Register one unique test student using actual UI fields and verify success response and resulting UI behavior', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create Account', level: 1 })).toBeVisible();

    const nameInput = page.getByPlaceholder('Full Name');
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password (minimum 6 characters)');
    const roleSelect = page.locator('select');
    const registerButton = page.getByRole('button', { name: 'Register' });

    // Fill registration form with valid input
    await nameInput.fill(testStudent.name);
    await emailInput.fill(testStudent.email);
    await passwordInput.fill(testStudent.password);
    await roleSelect.selectOption('student');

    // Submit form and intercept API response
    const [registerResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST'),
      registerButton.click()
    ]);

    // Verify API response shape
    expect(registerResponse.status()).toBe(201);
    const registerBody = await registerResponse.json();
    expect(registerBody.success).toBe(true);
    expect(registerBody.message).toBe('Registration successful');
    expect(registerBody.data).toBeDefined();
    expect(registerBody.data.token).toBeTruthy();
    expect(registerBody.data.user.email).toBe(testStudent.email.toLowerCase());
    expect(registerBody.data.user.name).toBe(testStudent.name);
    expect(registerBody.data.user.role).toBe('student');

    // Record created email for scoped teardown
    createdTestEmails.push(testStudent.email.toLowerCase());

    // Verify UI toast feedback
    await expect(
      page.locator('.Toastify__toast', { hasText: 'Registration successful' })
    ).toBeVisible();

    // Verify navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify authenticated state displayed in MainLayout
    await expect(page.getByText('Signed in as')).toBeVisible();
    await expect(page.locator('aside').getByText(testStudent.name)).toBeVisible();
    await expect(page.locator('header').getByText(testStudent.name)).toBeVisible();
    await expect(page.locator('aside').getByText('student', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();

    // Verify token and user stored in localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem('parking_token'));
    const storedUser = await page.evaluate(() => JSON.parse(localStorage.getItem('parking_user') || 'null'));
    expect(storedToken).toBe(registerBody.data.token);
    expect(storedUser?.email).toBe(testStudent.email.toLowerCase());
    expect(storedUser?.role).toBe('student');

    // Confirm record exists in isolated MongoDB test database
    const dbUser = await User.findOne({ email: testStudent.email.toLowerCase() });
    expect(dbUser).not.toBeNull();
    expect(dbUser.name).toBe(testStudent.name);
    expect(dbUser.role).toBe('student');
  });

  test('2. Verify duplicate registration is handled correctly and rejected safely', async ({ page }) => {
    // In a fresh browser session, attempt to register again with the same unique email
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/);

    const nameInput = page.getByPlaceholder('Full Name');
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password (minimum 6 characters)');
    const registerButton = page.getByRole('button', { name: 'Register' });

    await nameInput.fill(testStudent.name);
    await emailInput.fill(testStudent.email);
    await passwordInput.fill(testStudent.password);

    const [duplicateResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/register') && res.request().method() === 'POST'),
      registerButton.click()
    ]);

    // Verify duplicate registration rejection (409 Conflict)
    expect(duplicateResponse.status()).toBe(409);
    const duplicateBody = await duplicateResponse.json();
    expect(duplicateBody.success).toBe(false);
    expect(duplicateBody.message).toBe('User already exists');

    // Verify UI error toast is presented to the user
    await expect(
      page.locator('.Toastify__toast', { hasText: 'User already exists' })
    ).toBeVisible();

    // Verify browser remains on the registration page and does not navigate
    await expect(page).toHaveURL(/\/register$/);
    await expect(registerButton).toBeVisible();
  });

  test('3. Verify invalid credentials are rejected without exposing sensitive details', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);

    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    // Submit with registered email but incorrect password
    await emailInput.fill(testStudent.email);
    await passwordInput.fill('IncorrectPassword999!');

    const [invalidResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      signInButton.click()
    ]);

    // Verify 401 Unauthorized status and generic error message
    expect(invalidResponse.status()).toBe(401);
    const invalidBody = await invalidResponse.json();
    expect(invalidBody.success).toBe(false);
    expect(invalidBody.message).toBe('Invalid credentials');

    // Sensitive detail verification: ensure no sensitive data or stack traces are leaked
    expect(invalidBody.data).toBeUndefined();
    const serialized = JSON.stringify(invalidBody);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('hash');
    expect(serialized).not.toContain('stack');

    // Verify UI feedback toast
    await expect(
      page.locator('.Toastify__toast', { hasText: 'Invalid credentials' })
    ).toBeVisible();

    // Verify page remains on /login without session persistence
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem('parking_token'));
    expect(token).toBeNull();
  });

  test('4. Log in with the registered test student account through the UI and verify authenticated state', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);

    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });

    // Submit valid credentials
    await emailInput.fill(testStudent.email);
    await passwordInput.fill(testStudent.password);

    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
      signInButton.click()
    ]);

    // Verify successful login API response
    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.message).toBe('Login successful');
    expect(loginBody.data.token).toBeTruthy();
    expect(loginBody.data.user.email).toBe(testStudent.email.toLowerCase());
    expect(loginBody.data.user.role).toBe('student');

    // Verify UI feedback toast
    await expect(
      page.locator('.Toastify__toast', { hasText: 'Login successful' })
    ).toBeVisible();

    // Verify navigation to protected dashboard page
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify authenticated user details in MainLayout
    await expect(page.getByText('Signed in as')).toBeVisible();
    await expect(page.locator('aside').getByText(testStudent.name)).toBeVisible();
    await expect(page.locator('header').getByText(testStudent.name)).toBeVisible();
    await expect(page.locator('aside').getByText('student', { exact: true })).toBeVisible();

    // Verify student-appropriate navigation items are visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reservations' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

    // Verify privileged links are NOT accessible to student role
    await expect(page.getByRole('link', { name: 'Areas' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Slots' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Security' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

    // Verify localStorage session
    const storedToken = await page.evaluate(() => localStorage.getItem('parking_token'));
    const storedUser = await page.evaluate(() => JSON.parse(localStorage.getItem('parking_user') || 'null'));
    expect(storedToken).toBe(loginBody.data.token);
    expect(storedUser?.email).toBe(testStudent.email.toLowerCase());

    // Verify Sign out functionality returns to login page and clears session
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    await expect(page).toHaveURL(/\/login$/);
    const tokenAfterSignOut = await page.evaluate(() => localStorage.getItem('parking_token'));
    expect(tokenAfterSignOut).toBeNull();
  });
});

