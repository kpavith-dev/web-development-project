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

  test('6. Forgot password page loads with expected layout, heading, and controls', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Reset your password', level: 1 })).toBeVisible();
    await expect(
      page.getByText("Enter your email and we'll send a reset link if an eligible account exists.")
    ).toBeVisible();

    const emailInput = page.getByPlaceholder('Email address');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('autoComplete', 'email');

    const submitBtn = page.getByRole('button', { name: 'Send reset link' });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    const backLink = page.getByRole('link', { name: 'Back to sign in' });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/login');
  });

  test('7. Forgot password prevents empty email submission via required-field validation', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.getByPlaceholder('Email address');
    const submitBtn = page.getByRole('button', { name: 'Send reset link' });

    // Empty field fails HTML5 constraint validation
    const isValid = await emailInput.evaluate((el) => el.validity.valid);
    expect(isValid).toBe(false);

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/forgot-password')) {
        apiCalled = true;
      }
    });

    await submitBtn.click();
    expect(apiCalled).toBe(false);
  });

  test('8. Forgot password sends expected payload and displays anti-enumeration confirmation state', async ({ page }) => {
    let capturedPayload = null;
    let requestMethod = null;

    await page.route('**/api/auth/forgot-password', async (route) => {
      requestMethod = route.request().method();
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'If an account exists for that email, a reset link has been sent.',
          data: null,
        }),
      });
    });

    await page.goto('/forgot-password');
    const emailInput = page.getByPlaceholder('Email address');
    const submitBtn = page.getByRole('button', { name: 'Send reset link' });

    await emailInput.fill('student.test@campus.edu');
    await submitBtn.click();

    // Verify API request payload and method
    expect(requestMethod).toBe('POST');
    expect(capturedPayload).toEqual({ email: 'student.test@campus.edu' });

    // Verify confirmation state replaced form
    await expect(
      page.getByText('If an account exists for that email, a reset link has been sent.')
    ).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Send reset link' })).toHaveCount(0);
  });

  test('9. Forgot password displays expected error feedback when API request fails', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Unable to request a reset link at this time.',
        }),
      });
    });

    await page.goto('/forgot-password');
    await page.getByPlaceholder('Email address').fill('student.error@campus.edu');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(
      page.locator('.Toastify__toast', { hasText: 'Unable to request a reset link at this time.' })
    ).toBeVisible();
    // Verify form remains rendered
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
  });

  test('10. Reset password displays invalid link error when token query parameter is missing', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/reset-password$/);

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/reset-password')) {
        apiCalled = true;
      }
    });

    await page.getByPlaceholder('New password', { exact: true }).fill('ValidPass123');
    await page.getByPlaceholder('Confirm new password').fill('ValidPass123');
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(
      page.locator('.Toastify__toast', { hasText: 'This reset link is invalid.' })
    ).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('11. Reset password loads with token, displaying heading, helper text, and controls', async ({ page }) => {
    await page.goto('/reset-password?token=sample-reset-token-123');
    await expect(page.getByRole('heading', { name: 'Choose a new password', level: 1 })).toBeVisible();
    await expect(
      page.getByText('Password must contain at least 6 characters, including uppercase, lowercase and a number.')
    ).toBeVisible();

    const newPassInput = page.getByPlaceholder('New password', { exact: true });
    const confirmPassInput = page.getByPlaceholder('Confirm new password');
    const resetBtn = page.getByRole('button', { name: 'Reset password' });

    await expect(newPassInput).toBeVisible();
    await expect(newPassInput).toHaveAttribute('type', 'password');
    await expect(newPassInput).toHaveAttribute('required', '');
    await expect(newPassInput).toHaveAttribute('minLength', '6');

    await expect(confirmPassInput).toBeVisible();
    await expect(confirmPassInput).toHaveAttribute('type', 'password');
    await expect(confirmPassInput).toHaveAttribute('required', '');
    await expect(confirmPassInput).toHaveAttribute('minLength', '6');

    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toBeEnabled();
  });

  test('12. Password visibility toggles work independently and do not submit the form', async ({ page }) => {
    await page.goto('/reset-password?token=sample-reset-token-123');

    const newPassInput = page.getByPlaceholder('New password', { exact: true });
    const confirmPassInput = page.getByPlaceholder('Confirm new password');

    await newPassInput.fill('SecretPass123');
    await confirmPassInput.fill('SecretConfirm123');

    const showNewPassBtn = page.getByRole('button', { name: 'Show password' });
    const showConfirmPassBtn = page.getByRole('button', { name: 'Show confirm password' });

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/reset-password')) {
        apiCalled = true;
      }
    });

    // Toggle new password visibility only
    await expect(newPassInput).toHaveAttribute('type', 'password');
    await expect(confirmPassInput).toHaveAttribute('type', 'password');
    await showNewPassBtn.click();

    // New password is text, confirm password remains password
    await expect(newPassInput).toHaveAttribute('type', 'text');
    await expect(confirmPassInput).toHaveAttribute('type', 'password');
    expect(await newPassInput.inputValue()).toBe('SecretPass123');

    // Toggle confirm password visibility
    await showConfirmPassBtn.click();
    await expect(confirmPassInput).toHaveAttribute('type', 'text');
    expect(await confirmPassInput.inputValue()).toBe('SecretConfirm123');

    // Toggle back to hidden
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(newPassInput).toHaveAttribute('type', 'password');
    await expect(confirmPassInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide confirm password' }).click();
    await expect(confirmPassInput).toHaveAttribute('type', 'password');

    // Ensure clicking toggle buttons never dispatched API submission
    expect(apiCalled).toBe(false);
  });

  test('13. Reset password enforces password complexity and matching validations', async ({ page }) => {
    await page.goto('/reset-password?token=sample-reset-token-123');

    const newPassInput = page.getByPlaceholder('New password', { exact: true });
    const confirmPassInput = page.getByPlaceholder('Confirm new password');
    const resetBtn = page.getByRole('button', { name: 'Reset password' });

    let apiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/reset-password')) {
        apiCalled = true;
      }
    });

    // 1. Password shorter than 6 characters fails HTML5 constraint
    await newPassInput.fill('Aa1');
    await confirmPassInput.fill('Aa1');
    const tooShort = await newPassInput.evaluate((el) => el.validity.tooShort);
    expect(tooShort).toBe(true);

    // 2. Password failing regex complexity (all lowercase, length >= 6)
    await newPassInput.fill('lowercaseonly123');
    await confirmPassInput.fill('lowercaseonly123');
    await resetBtn.click();
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Password must contain at least 6 characters, including uppercase, lowercase and a number.',
      }).first()
    ).toBeVisible();
    expect(apiCalled).toBe(false);

    // 3. Password failing regex complexity (missing number, length >= 6)
    await newPassInput.fill('NoNumberPassword');
    await confirmPassInput.fill('NoNumberPassword');
    await resetBtn.click();
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Password must contain at least 6 characters, including uppercase, lowercase and a number.',
      }).last()
    ).toBeVisible();
    expect(apiCalled).toBe(false);

    // 4. Mismatched passwords
    await newPassInput.fill('ValidPassword123');
    await confirmPassInput.fill('DifferentPassword456');
    await resetBtn.click();
    await expect(
      page.locator('.Toastify__toast', { hasText: 'Passwords do not match.' })
    ).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('14. Reset password successfully submits payload, shows toast, and navigates to login', async ({ page }) => {
    let capturedPayload = null;
    let requestMethod = null;

    await page.route('**/api/auth/reset-password', async (route) => {
      requestMethod = route.request().method();
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password reset successful. You can now sign in.',
          data: null,
        }),
      });
    });

    await page.goto('/reset-password?token=verified-token-xyz');
    await page.getByPlaceholder('New password', { exact: true }).fill('NewSecurePass123');
    await page.getByPlaceholder('Confirm new password').fill('NewSecurePass123');
    await page.getByRole('button', { name: 'Reset password' }).click();

    expect(requestMethod).toBe('POST');
    expect(capturedPayload).toEqual({
      token: 'verified-token-xyz',
      password: 'NewSecurePass123',
    });

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Password reset successful. You can now sign in.',
      })
    ).toBeVisible();
  });

  test('15. Reset password handles backend validation errors and message-based errors', async ({ page }) => {
    // 1. Array-shaped validation errors
    await page.route('**/api/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          errors: [
            { field: 'password', message: 'Backend complexity error: must include special character.' },
            { field: 'token', message: 'Backend token error: expired signature.' },
          ],
        }),
      });
    });

    await page.goto('/reset-password?token=expired-token-123');
    await page.getByPlaceholder('New password', { exact: true }).fill('ValidPass123');
    await page.getByPlaceholder('Confirm new password').fill('ValidPass123');
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Backend complexity error: must include special character.',
      })
    ).toBeVisible();
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'Backend token error: expired signature.',
      })
    ).toBeVisible();

    // 2. Generic message-based error (e.g. invalid or expired link)
    await page.unroute('**/api/auth/reset-password');
    await page.route('**/api/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'This password reset link is invalid or has expired',
        }),
      });
    });

    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(
      page.locator('.Toastify__toast', {
        hasText: 'This password reset link is invalid or has expired',
      })
    ).toBeVisible();

    // Page must remain on /reset-password
    await expect(page).toHaveURL(/\/reset-password\?token=expired-token-123$/);
  });
});

