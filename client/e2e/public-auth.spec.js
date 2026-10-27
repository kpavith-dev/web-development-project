import { test, expect } from '@playwright/test';

test.describe('Non-destructive public authentication pages', () => {
  test('1. The registration page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create Account', level: 1 })).toBeVisible();
    await expect(page.getByText('Join the university parking system.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('2. Student, Staff, and Lecturer options are visible', async ({ page }) => {
    await page.goto('/register');
    const roleSelect = page.locator('select');
    await expect(roleSelect).toBeVisible();

    const studentOption = roleSelect.locator('option[value="student"]');
    const staffOption = roleSelect.locator('option[value="staff"]');
    const lecturerOption = roleSelect.locator('option[value="lecturer"]');

    await expect(studentOption).toHaveText('Student');
    await expect(staffOption).toHaveText('Staff');
    await expect(lecturerOption).toHaveText('Lecturer');

    // Default selection is student
    await expect(roleSelect).toHaveValue('student');

    // Verify selectable options
    await roleSelect.selectOption('staff');
    await expect(roleSelect).toHaveValue('staff');

    await roleSelect.selectOption('lecturer');
    await expect(roleSelect).toHaveValue('lecturer');

    await roleSelect.selectOption('student');
    await expect(roleSelect).toHaveValue('student');
  });

  test('3. Admin and Security are not offered in public registration', async ({ page }) => {
    await page.goto('/register');
    const roleSelect = page.locator('select');
    await expect(roleSelect).toBeVisible();

    // Verify Admin and Security are not present in options or values
    await expect(roleSelect.locator('option[value="admin"]')).toHaveCount(0);
    await expect(roleSelect.locator('option[value="security"]')).toHaveCount(0);
    await expect(roleSelect.locator('option', { hasText: /admin/i })).toHaveCount(0);
    await expect(roleSelect.locator('option', { hasText: /security/i })).toHaveCount(0);

    // Verify only the 3 designated public roles exist
    const options = await roleSelect.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
    expect(options).toEqual(['student', 'staff', 'lecturer']);
  });

  test('4. Required fields and invalid form inputs show appropriate validation feedback', async ({ page }) => {
    await page.goto('/register');

    const nameInput = page.getByPlaceholder('Full Name');
    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password (minimum 6 characters)');
    const registerButton = page.getByRole('button', { name: 'Register' });

    // Verify HTML5 required and constraint attributes
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('minLength', '6');

    // Empty fields fail HTML5 constraint validation
    const nameValidBefore = await nameInput.evaluate((el) => el.validity.valid);
    expect(nameValidBefore).toBe(false);

    // Invalid email triggers HTML5 typeMismatch
    await emailInput.fill('not-an-email');
    const emailMismatch = await emailInput.evaluate((el) => el.validity.typeMismatch);
    expect(emailMismatch).toBe(true);

    // Password requirements guidance is visible to the user
    await expect(
      page.getByText('Password must contain at least 6 characters, including uppercase, lowercase and a number.')
    ).toBeVisible();

    // Guard: Ensure no network request is sent to backend registration endpoint
    let apiRegisterCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/register')) {
        apiRegisterCalled = true;
      }
    });

    // Provide valid email format and name, but invalid password (missing uppercase & number)
    await nameInput.fill('Prospective User');
    await emailInput.fill('prospective@campus.edu');
    await passwordInput.fill('invalidpassword');

    // Attempt to submit with invalid password complexity
    await registerButton.click();

    // Client-side validation toast feedback is presented
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Password must contain at least 6 characters, including uppercase, lowercase and a number.',
      })
    ).toBeVisible();

    // Confirm registration was blocked client-side with no account creation request
    expect(apiRegisterCalled).toBe(false);
  });

  test('5. The login page loads and its main form controls are visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back', level: 1 })).toBeVisible();
    await expect(page.getByText('Sign in to manage your parking reservations.')).toBeVisible();

    const emailInput = page.getByPlaceholder('Email');
    const passwordInput = page.getByPlaceholder('Password');
    const signInButton = page.getByRole('button', { name: 'Sign In' });
    const registerLink = page.getByRole('link', { name: 'Register' });
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });

    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');

    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('minLength', '6');

    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();

    await expect(registerLink).toBeVisible();
    await expect(forgotPasswordLink).toBeVisible();
  });
});

