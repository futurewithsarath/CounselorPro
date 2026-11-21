import { chromium, Browser, Page } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

function createMockJwt(claims: Record<string, any>) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://securetoken.google.com/counselorpro',
    aud: 'counselorpro',
    auth_time: now,
    user_id: claims.uid || 'test-student-uid-101',
    sub: claims.uid || 'test-student-uid-101',
    iat: now,
    exp: now + 3600 * 24,
    email: claims.email || 'student@counselorpro.test',
    email_verified: true,
    firebase: {
      identities: {
        email: [claims.email || 'student@counselorpro.test']
      },
      sign_in_provider: 'password'
    },
    ...claims
  })).toString('base64url');
  return `${header}.${payload}.mock_signature_data`;
}

async function runAuthBugFixTests() {
  console.log('\n========================================================================');
  console.log('   COUNSELORPRO — AUTHENTICATION BUG FIX VERIFICATION SUITE              ');
  console.log('========================================================================\n');

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page: Page = await context.newPage();
  const BASE_URL = 'http://localhost:3000';

  let testPassed = 0;
  let testFailed = 0;

  function assertCheck(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      testPassed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? `(${details})` : ''}`);
      testFailed++;
    }
  }

  // Intercept Google Analytics & tracking
  await page.route('**/google-analytics.com/**', route => route.abort());
  await page.route('**/analytics.google.com/**', route => route.abort());

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Load Homepage & Open Auth Modal
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing Homepage & Sign-In Modal Opening ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);

    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = await page.locator('h2:has-text("Sign In to Your Account")').isVisible();
    assertCheck('Sign In modal opened successfully', modalTitle);

    // ------------------------------------------------------------------------
    // TEST 2: Email Login - Format Validation
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Email Login Format Validation ---');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('invalid-email-address');
    await passwordInput.fill('password123');
    
    // Submit form
    const submitBtn = page.locator('button[type="submit"]:has-text("Sign In")');
    await submitBtn.click();
    await page.waitForTimeout(300);

    // Should catch format error or HTML5 email validation
    const emailValidationMsg = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    const hasFormatValidation = Boolean(emailValidationMsg) || (await page.locator('text=valid email address').isVisible());
    assertCheck('Invalid email format is rejected by client validation', hasFormatValidation, emailValidationMsg);

    // ------------------------------------------------------------------------
    // TEST 3: Email Login - Firebase Rejection (Wrong Password / User Not Found)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Email Login Rejection Handling ---');
    // Mock Firebase Auth REST failure for invalid credentials
    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 400,
            message: 'INVALID_LOGIN_CREDENTIALS',
            errors: [{ message: 'INVALID_LOGIN_CREDENTIALS', domain: 'global', reason: 'invalid' }]
          }
        })
      });
    });

    await emailInput.fill('unknown.student@counselorpro.org');
    await passwordInput.fill('WrongPassword999!');
    await submitBtn.click();
    await page.waitForTimeout(600);

    const errorVisible = await page.locator('text=Invalid email or password').isVisible();
    assertCheck('Wrong credentials return clear error and prevent login', errorVisible);

    const isButtonReset = !(await submitBtn.isDisabled());
    assertCheck('Sign In button loading state resets properly after error', isButtonReset);

    // Unroute signInWithPassword mock
    await page.unroute('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**');

    // ------------------------------------------------------------------------
    // TEST 4: Email Signup - Infinite Loading Resolution
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Email Signup Flow (No Infinite Loading) ---');
    const createAccountTab = page.locator('button:has-text("Create Account")');
    await createAccountTab.click();
    await page.waitForTimeout(400);

    const nameInput = page.locator('input[placeholder="Ravi Kumar"]');
    const signupEmailInput = page.locator('input[placeholder="student@example.com"]');
    const signupPassInput = page.locator('input[placeholder="Min 6 chars"]');
    const signupConfirmInput = page.locator('input[placeholder="Repeat password"]');
    const signupSubmitBtn = page.locator('button[type="submit"]:has-text("Create Student Account")');

    // Password mismatch validation
    await nameInput.fill('Test Student');
    await signupEmailInput.fill('newstudent@test.counselorpro.org');
    await signupPassInput.fill('secret123');
    await signupConfirmInput.fill('different123');
    await signupSubmitBtn.click();
    await page.waitForTimeout(300);

    const mismatchError = await page.locator('text=Passwords do not match').isVisible();
    assertCheck('Password mismatch validation blocks submission', mismatchError);

    // Matching passwords - mock successful account creation
    await signupConfirmInput.fill('secret123');

    const mockNewStudentJwt = createMockJwt({
      uid: 'new-student-999',
      email: 'newstudent@test.counselorpro.org',
      role: 'student'
    });

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signUp**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#SignupNewUserResponse',
          idToken: mockNewStudentJwt,
          email: 'newstudent@test.counselorpro.org',
          refreshToken: 'mock-refresh-token-new',
          expiresIn: '3600',
          localId: 'new-student-999'
        })
      });
    });

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:update**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          localId: 'new-student-999',
          email: 'newstudent@test.counselorpro.org',
          displayName: 'Test Student',
          idToken: mockNewStudentJwt
        })
      });
    });

    await signupSubmitBtn.click();
    await page.waitForTimeout(1000);

    // Check that modal closes upon successful creation or user is logged in
    const modalClosed = !(await page.locator('h2:has-text("Create Your Student Account")').isVisible());
    assertCheck('Signup completes and closes AuthModal without infinite hang', modalClosed);

    await page.unroute('**/identitytoolkit.googleapis.com/v1/accounts:signUp**');
    await page.unroute('**/identitytoolkit.googleapis.com/v1/accounts:update**');

    // ------------------------------------------------------------------------
    // TEST 5: Phone Authentication - SMS Region & Error Handling
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Phone Authentication Flow & Error Mapping ---');
    // Open auth modal again
    const navBtn = page.locator('button:has-text("Sign In")').first();
    if (await navBtn.isVisible()) {
      await navBtn.click();
      await page.waitForTimeout(400);
    } else {
      // User might be logged in, log out first
      const profileMenu = page.locator('button:has-text("Test Student")').or(page.locator('button:has-text("Student")')).first();
      if (await profileMenu.isVisible()) {
        await profileMenu.click();
        await page.waitForTimeout(200);
        await page.locator('button:has-text("Sign Out")').click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Sign In")').first().click();
        await page.waitForTimeout(400);
      }
    }

    const phoneTabBtn = page.locator('button:has-text("Phone OTP")');
    await phoneTabBtn.click();
    await page.waitForTimeout(400);

    const phoneInput = page.locator('input[placeholder="98765 43210"]');
    const sendOtpBtn = page.locator('button[type="submit"]:has-text("Send Verification Code")');

    // Test incomplete phone number
    await phoneInput.fill('12345');
    const isSendDisabled = await sendOtpBtn.isDisabled();
    assertCheck('Send code button is disabled when number is less than 10 digits', isSendDisabled);

    // Enter 10 digits
    await phoneInput.fill('9876543210');
    assertCheck('Send code button is enabled for valid 10-digit number', !(await sendOtpBtn.isDisabled()));

    // Click Send Verification Code -> Since Firebase project has SMS Region Policy restricted for India without Blaze/SMS allowlist,
    // verify that error handling maps operation-not-allowed / billing clearly
    await sendOtpBtn.click();
    await page.waitForTimeout(1500);

    // Verify clear descriptive error message is shown (no uncaught error, no infinite spinner)
    const errorAlert = page.locator('div.text-red-700');
    const isErrorShown = await errorAlert.isVisible();
    const errorText = isErrorShown ? await errorAlert.innerText() : '';
    console.log(`   Captured Phone Auth Notice: "${errorText.slice(0, 120)}..."`);
    
    assertCheck('Descriptive error displayed for Phone Auth restriction', isErrorShown && (
      errorText.includes('SMS unable to be sent') || 
      errorText.includes('auth/operation-not-allowed') ||
      errorText.includes('Firebase Console') ||
      errorText.includes('reCAPTCHA') ||
      errorText.includes('Email')
    ), errorText);

    const isPhoneBtnReset = !(await page.locator('button:has-text("Sending code...")').isVisible());
    assertCheck('Phone button loading state resets and does not hang', isPhoneBtnReset);

    console.log('\n------------------------------------------------------------------------');
    console.log(`VERIFICATION SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log('------------------------------------------------------------------------\n');

  } catch (err: any) {
    console.error('Test execution encountered fatal error:', err);
    testFailed++;
  } finally {
    await browser.close();
  }

  process.exit(testFailed === 0 ? 0 : 1);
}

runAuthBugFixTests();
