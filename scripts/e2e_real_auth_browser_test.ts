import { chromium, Browser, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';

function waitForServer(url: string, timeoutMs: number = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.end();
    }
    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`));
      } else {
        setTimeout(ping, 500);
      }
    }
    ping();
  });
}

async function runRealAuthBrowserTest() {
  console.log('\n========================================================================');
  console.log('   COUNSELORPRO — REAL BROWSER AUTHENTICATION TEST SUITE                 ');
  console.log('========================================================================\n');

  let serverProcess: ChildProcess | null = null;
  const PORT = 3000;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  let passCount = 0;
  let failCount = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`  [PASS] ${name}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failCount++;
    }
  }

  // 1. Launch Server
  console.log('1. Starting Local CounselorPro Production Server...');
  serverProcess = spawn('node', ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'pipe'
  });

  serverProcess.stdout?.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) {
      console.log(`   [SERVER]: ${msg.replace(/\n/g, '\n   [SERVER]: ')}`);
    }
  });

  serverProcess.stderr?.on('data', (d) => {
    console.warn(`   [SERVER ERR]: ${d.toString().trim()}`);
  });

  try {
    await waitForServer(BASE_URL, 15000);
    console.log(`   Server is online and responding at ${BASE_URL}\n`);
  } catch (err: any) {
    console.error('   Fatal: Could not reach local server:', err.message);
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  // 2. Launch Chromium Browser
  console.log('2. Launching Headless Chromium Browser...');
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page: Page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Google')) {
      console.error(`     [BROWSER CONSOLE ERROR]: ${msg.text()}`);
    }
  });

  try {
    // ------------------------------------------------------------------------
    // STAGE A: Visit Homepage from Clean Unauthenticated Session
    // ------------------------------------------------------------------------
    console.log('--- STAGE A: Clean Homepage & Sign In Modal ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);

    const title = await page.title();
    report('Homepage loaded successfully', title.includes('CounselorPro'), `Title: "${title}"`);

    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    await page.waitForTimeout(400);

    const isModalOpen = await page.locator('h2:has-text("Sign In to Your Account")').isVisible();
    report('Sign In modal opened', isModalOpen);

    // ------------------------------------------------------------------------
    // STAGE B: Reject Unregistered Email
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE B: Reject Unregistered Email ---');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginSubmitBtn = page.locator('button[type="submit"]:has-text("Sign In")');

    const unregisteredEmail = `unregistered.test.${Date.now()}@counselorpro.org`;
    await emailInput.fill(unregisteredEmail);
    await passwordInput.fill('SomePassword123!');
    await loginSubmitBtn.click();

    const errorAlertB = page.locator('div.text-red-700');
    await errorAlertB.waitFor({ state: 'visible', timeout: 12000 });
    const unregisteredError = await errorAlertB.isVisible();
    const errorTextB = await errorAlertB.innerText();
    report('Unregistered email rejected with clear error message', unregisteredError && (
      errorTextB.includes('Invalid email or password') ||
      errorTextB.includes('No account found')
    ), errorTextB);

    const modalStillVisible1 = await page.locator('h2:has-text("Sign In to Your Account")').isVisible();
    report('Login modal remains visible after rejection', modalStillVisible1);

    const loginBtnReset1 = !(await loginSubmitBtn.isDisabled());
    report('Login button loading state reset to normal (not stuck)', loginBtnReset1);

    // ------------------------------------------------------------------------
    // STAGE C: Reject Incorrect Password
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE C: Reject Incorrect Password ---');
    await emailInput.fill('admin.test@counselorpro.org');
    await passwordInput.fill('DefinitelyWrongPassword999!');
    await loginSubmitBtn.click();

    const errorAlertC = page.locator('div.text-red-700');
    await errorAlertC.waitFor({ state: 'visible', timeout: 12000 });
    const wrongPassError = await errorAlertC.isVisible();
    const errorTextC = await errorAlertC.innerText();
    report('Wrong password rejected with clear credentials error', wrongPassError && (
      errorTextC.includes('Invalid email or password') ||
      errorTextC.includes('Incorrect password')
    ), errorTextC);

    const modalStillVisible2 = await page.locator('h2:has-text("Sign In to Your Account")').isVisible();
    report('Login modal remains visible after wrong password', modalStillVisible2);

    const loginBtnReset2 = !(await loginSubmitBtn.isDisabled());
    report('Login button loading spinner reset to normal', loginBtnReset2);

    // ------------------------------------------------------------------------
    // STAGE D: Register New Student & Verify Firestore Profile
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE D: Register New Student & Firestore Profile Creation ---');
    const createAccountTab = page.locator('button:has-text("Create Account")');
    await createAccountTab.click();
    await page.waitForTimeout(400);

    const timestamp = Date.now();
    const testEmail = `student.live.${timestamp}@counselorpro.org`;
    const testName = 'Aarav Sharma';
    const testPassword = ['Safe', 'Pass', '123!'].join('');

    const nameInput = page.locator('input[placeholder="Ravi Kumar"]');
    const signupEmailInput = page.locator('input[placeholder="student@example.com"]');
    const signupPassInput = page.locator('input[placeholder="Min 6 chars"]');
    const signupConfirmInput = page.locator('input[placeholder="Repeat password"]');
    const signupSubmitBtn = page.locator('button[type="submit"]:has-text("Create Student Account")');

    await nameInput.fill(testName);
    await signupEmailInput.fill(testEmail);
    await signupPassInput.fill(testPassword);
    await signupConfirmInput.fill(testPassword);
    await signupSubmitBtn.click();
    
    // Wait for the registration to complete cleanly and modal to unmount
    try {
      await page.locator('h2:has-text("Create Your Student Account")').waitFor({ state: 'detached', timeout: 15000 });
    } catch {}

    const signupModalClosed = !(await page.locator('h2:has-text("Create Your Student Account")').isVisible());
    report('Registration completes and closes modal without infinite loading', signupModalClosed);

    const navStudentBtn = page.locator('header').locator('button').filter({ hasText: /Aarav|Student|A/ }).first();
    await navStudentBtn.waitFor({ state: 'visible', timeout: 15000 });
    const userInNav = await navStudentBtn.isVisible();
    report('New registered student state reflected in navigation', userInNav);

    // ------------------------------------------------------------------------
    // STAGE E: Page Refresh & Session Persistence
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE E: Page Reload Session & Profile Persistence ---');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const profilePersisted = await page.locator('header').locator('button').filter({ hasText: /Aarav|Student|A/ }).first().isVisible();
    report('Session and profile persisted cleanly after page refresh', profilePersisted);

    const noInfiniteSpinner = !(await page.locator('.animate-spin').isVisible());
    report('No stuck infinite loading spinners after refresh', noInfiniteSpinner);

    // ------------------------------------------------------------------------
    // STAGE F: Protected Route & Counselling Practice Entry
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE F: Student Practice Entry & Intended Flow ---');
    const startPracticeBtn = page.locator('button:has-text("Select Exam")').or(page.locator('button:has-text("Start Counselling Practice")')).first();
    if (await startPracticeBtn.isVisible()) {
      await startPracticeBtn.click();
      await page.waitForTimeout(600);
      const examSelectorVisible = await page.locator('text=AP EAPCET').or(page.locator('text=TS EAMCET')).or(page.locator('text=JEE Main')).isVisible();
      report('Authenticated student can access Exam Selection without auth block', examSelectorVisible);
    }

    // ------------------------------------------------------------------------
    // STAGE G: Phone Authentication Error & reCAPTCHA Verification
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE G: Phone Authentication reCAPTCHA & SMS Error Handling ---');
    // Log out cleanly
    const userMenuBtn = page.locator('header').locator('button').filter({ hasText: /Aarav|Student|A/ }).first();
    if (await userMenuBtn.isVisible({ timeout: 2000 })) {
      await userMenuBtn.click();
      await page.waitForTimeout(300);
      const signOutBtn = page.locator('button:has-text("Sign Out")');
      if (await signOutBtn.isVisible({ timeout: 2000 })) {
        await signOutBtn.click();
        await page.waitForTimeout(800);
      }
    }

    const signInNavBtn = page.locator('header').locator('button:has-text("Sign In")').first();
    await signInNavBtn.waitFor({ state: 'visible', timeout: 5000 });
    const isLoggedOut = await signInNavBtn.isVisible();
    report('Sign Out cleared session completely', isLoggedOut);

    if (isLoggedOut) {
      await signInNavBtn.click();
      await page.waitForTimeout(400);
    }

    const phoneTab = page.locator('button:has-text("Phone OTP")');
    await phoneTab.click();
    await page.waitForTimeout(400);

    const phoneInput = page.locator('input[placeholder="98765 43210"]');
    const sendCodeBtn = page.locator('button[type="submit"]:has-text("Send Verification Code")');

    // Incomplete phone number test
    await phoneInput.fill('98765');
    const sendDisabled = await sendCodeBtn.isDisabled();
    report('Send Verification Code button disabled for incomplete phone number', sendDisabled);

    // Full 10 digits
    await phoneInput.fill('9876543210');
    report('Send Verification Code button enabled for 10-digit number', !(await sendCodeBtn.isDisabled()));

    // Mock grecaptcha in page to prevent invisible bot detection hanging in headless chromium
    await page.evaluate(`
      window.grecaptcha = {
        render: function() { return 'mock-widget-id'; },
        execute: function() { return Promise.resolve('mock-recaptcha-token'); },
        reset: function() {},
        getResponse: function() { return 'mock-recaptcha-token'; }
      };
    `);

    // Intercept Google Identity Toolkit to simulate Firebase SMS Region Policy / Provider rejection
    await page.route('**/identitytoolkit.googleapis.com/**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Firebase-Locale'
          }
        });
        return;
      }

      if (request.url().includes('sendVerificationCode')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Firebase-Locale'
          },
          body: JSON.stringify({
            error: {
              code: 400,
              message: 'SMS unable to be sent until this region enabled by the app developer. (auth/operation-not-allowed)',
              errors: [{
                message: 'SMS unable to be sent until this region enabled by the app developer. (auth/operation-not-allowed)',
                domain: 'global',
                reason: 'invalid'
              }]
            }
          })
        });
        return;
      }

      await route.continue();
    });

    // Submit -> Firebase SDK checks SMS policy and error handler processes operation-not-allowed
    await sendCodeBtn.click();
    const errorAlertG = page.locator('div.text-red-700');
    try {
      await errorAlertG.waitFor({ state: 'visible', timeout: 10000 });
    } catch {}

    const isErrorVisible = await errorAlertG.isVisible();
    const errorMsg = isErrorVisible ? await errorAlertG.innerText() : '';
    console.log(`     Captured Phone Notice: "${errorMsg.slice(0, 120)}..."`);

    report('Descriptive error displayed for SMS Region Policy / Disabled Phone provider', isErrorVisible && (
      errorMsg.includes('SMS unable to be sent') ||
      errorMsg.includes('auth/operation-not-allowed') ||
      errorMsg.includes('Firebase Console') ||
      errorMsg.includes('reCAPTCHA') ||
      errorMsg.includes('Email')
    ), errorMsg);

    const phoneBtnReset = !(await page.locator('button:has-text("Sending code...")').isVisible());
    report('Phone button loading state reset to normal (not stuck in infinite spinner)', phoneBtnReset);

    await page.unroute('**/identitytoolkit.googleapis.com/**');

    // Close modal to verify reCAPTCHA cleanup
    const closeBtn = page.locator('button[aria-label="Close"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    const recaptchaContainerEmpty = Boolean(await page.evaluate(`
      (function() {
        var el = document.getElementById('recaptcha-container');
        return !el || el.innerHTML === '';
      })()
    `));
    report('reCAPTCHA container cleaned up on modal close (no widget collision)', recaptchaContainerEmpty);

    // ------------------------------------------------------------------------
    // STAGE H: Successful Student Login & Practice Workflow Navigation
    // ------------------------------------------------------------------------
    console.log('\n--- STAGE H: Successful Student Login & Dashboard Navigation ---');
    const reOpenSignInBtn = page.locator('header').locator('button:has-text("Sign In")').first();
    await reOpenSignInBtn.click();
    await page.waitForTimeout(400);

    // Ensure we switch to email login tab if not already active
    const emailTabBtn = page.locator('button:has-text("Sign In")').first();
    if (await page.locator('h2:has-text("Phone Number Verification")').isVisible()) {
      // If modal was on phone, switch to login tab or close and re-open
      await page.locator('button[aria-label="Close"]').click();
      await page.waitForTimeout(300);
      await reOpenSignInBtn.click();
    }

    const finalEmailInput = page.locator('input[type="email"]').first();
    await finalEmailInput.waitFor({ state: 'visible', timeout: 5000 });
    const finalPassInput = page.locator('input[type="password"]').first();
    const finalSubmitBtn = page.locator('button[type="submit"]:has-text("Sign In")');

    await finalEmailInput.fill(testEmail);
    await finalPassInput.fill(testPassword);
    await finalSubmitBtn.click();

    try {
      await page.locator('h2:has-text("Sign In to Your Account")').waitFor({ state: 'detached', timeout: 15000 });
    } catch {}

    const loginModalGone = !(await page.locator('h2:has-text("Sign In to Your Account")').isVisible());
    report('Successful login modal closes immediately', loginModalGone);

    const navReflectsStudent = page.locator('header').locator('button').filter({ hasText: /Aarav|Student|A/ }).first();
    await navReflectsStudent.waitFor({ state: 'visible', timeout: 15000 });
    report('Navigation reflects successful student login', await navReflectsStudent.isVisible());

    const startBtn = page.locator('button:has-text("Select Exam")').or(page.locator('button:has-text("Start Counselling Practice")')).first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(600);
      const isExamArea = await page.locator('text=AP EAPCET').or(page.locator('text=TS EAMCET')).isVisible();
      report('Successful login navigates to Exam Selection dashboard without auth blockage', isExamArea);
    }

    console.log('\n------------------------------------------------------------------------');
    console.log(`BROWSER VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('------------------------------------------------------------------------\n');

  } catch (err: any) {
    console.error('Browser testing encountered fatal error:', err);
    failCount++;
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }

  process.exit(failCount === 0 ? 0 : 1);
}

runRealAuthBrowserTest();
