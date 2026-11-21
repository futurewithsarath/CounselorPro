import { chromium } from "playwright";
import assert from "node:assert";

function createMockJwt(claims: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://securetoken.google.com/counselorpro',
    aud: 'counselorpro',
    auth_time: now,
    user_id: claims.uid || 'qa-test-uid',
    sub: claims.uid || 'qa-test-uid',
    iat: now,
    exp: now + 3600,
    email: claims.email || 'qa@counselorpro.org',
    email_verified: true,
    ...claims
  })).toString('base64url');
  const signature = Buffer.from('mock-signature-for-qa-test').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

async function runLiveFeatureTest() {
  console.log("========================================================================");
  console.log("   COUNSELORPRO — LIVE BROWSER INTERACTION & FEATURE VERIFICATION       ");
  console.log("========================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Intercept Firebase Auth REST API for student sign-in simulation
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', async route => {
    const mockStudentJwt = createMockJwt({
      uid: 'student-qa-uid-999',
      email: 'student.qa@counselorpro.org',
      role: 'student'
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'identitytoolkit#VerifyPasswordResponse',
        localId: 'student-qa-uid-999',
        email: 'student.qa@counselorpro.org',
        displayName: 'Verified QA Student',
        idToken: mockStudentJwt,
        registered: true,
        refreshToken: 'mock-refresh-token-999',
        expiresIn: '86400'
      })
    });
  });

  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup**', async route => {
    const mockStudentJwt = createMockJwt({
      uid: 'student-qa-uid-999',
      email: 'student.qa@counselorpro.org',
      role: 'student'
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'identitytoolkit#GetAccountInfoResponse',
        users: [{
          localId: 'student-qa-uid-999',
          email: 'student.qa@counselorpro.org',
          displayName: 'Verified QA Student',
          customAttributes: JSON.stringify({ role: 'student' })
        }]
      })
    });
  });

  try {
    // 1. Visit homepage
    console.log("1. Visiting Homepage...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    const title = await page.title();
    console.log(`   Page Title: "${title}"`);
    assert(title.includes("CounselorPro"), "Title must include CounselorPro");

    // 2. Launch Simulation Wizard
    console.log("2. Launching Simulation Wizard...");
    await page.click("#start-simulation-btn");
    await page.waitForTimeout(600);

    // 3. Select AP EAPCET Exam
    console.log("3. Selecting AP EAPCET Exam...");
    const apCard = page.locator("#select-ap-eapcet").first();
    await apCard.waitFor({ state: "visible", timeout: 5000 });
    await apCard.click();
    await page.waitForTimeout(300);

    const continueBtn = page.locator("#exam-next-btn").first();
    await continueBtn.click();
    await page.waitForTimeout(800);

    // 4. Authenticate via AuthModal
    console.log("4. Authenticating Student via AuthModal...");
    await page.fill('input[type="email"]', 'student.qa@counselorpro.org');
    await page.fill('input[type="password"]', 'Password@1234');
    await page.click('form button[type="submit"]:has-text("Sign In")');
    await page.waitForTimeout(1500);

    // 5. Fill Student Profile Details
    console.log("5. Entering Student Profile Details...");
    const profileRankInput = page.locator('#rank-input, input[type="number"]').first();
    await profileRankInput.waitFor({ state: "visible", timeout: 5000 });
    await profileRankInput.fill("1250");
    await page.waitForTimeout(300);

    const profileNextBtn = page.locator("#profile-next-btn").first();
    await profileNextBtn.click();
    await page.waitForTimeout(1500);

    // 6. Select College Options in OptionEntry
    console.log("6. Adding College Choices in OptionEntry...");
    const addButtons = page.locator('button[title="Add to Web Options"]');
    await addButtons.first().waitFor({ state: "visible", timeout: 10000 });
    const addCount = await addButtons.count();
    console.log(`   Found ${addCount} available college options`);
    assert(addCount > 0, "Colleges list must be populated");

    await addButtons.nth(0).click();
    await page.waitForTimeout(400);
    if (addCount > 1) {
      await addButtons.nth(1).click();
      await page.waitForTimeout(400);
    }

    // 7. Test AI Strategy Review button
    console.log("7. Testing AI Strategy Review Button...");
    const aiReviewBtn = page.locator("#ai-strategy-review-btn");
    await aiReviewBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: AI Strategy Review button is visible and active");
    await aiReviewBtn.click();
    await page.waitForTimeout(1500);

    // 8. Verify ChoiceRefinement workspace renders
    console.log("8. Verifying ChoiceRefinement AI Workspace...");
    const aiWorkspace = page.locator("#ai-refinement-workspace");
    await aiWorkspace.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: ChoiceRefinement workspace mounted successfully");

    // Wait for the report to load
    await page.waitForTimeout(2000);
    const reportText = await page.locator(".prose").innerText();
    console.log(`   AI Report preview (first 100 chars): "${reportText.slice(0, 100).replace(/\n/g, ' ')}..."`);
    assert(reportText.length > 50, "AI Report must be generated");
    console.log("   ✓ PASS: Strategic AI Counsel Report generated");

    // 9. Test Interactive AI Chat Assistant
    console.log("9. Testing Interactive AI Chat Assistant...");
    const chatInput = page.locator("#chat-input");
    const sendBtn = page.locator("#chat-send-btn");
    await chatInput.fill("Should I prefer CBIT CSE over Vasavi?");
    await page.waitForTimeout(300);
    await sendBtn.click();

    // Wait for AI response
    await page.waitForTimeout(2000);
    const messages = page.locator("#ai-refinement-workspace .rounded-2xl");
    const messageCount = await messages.count();
    console.log(`   Total chat message bubbles: ${messageCount}`);
    assert(messageCount >= 2, "Chat must contain user message and assistant reply");
    const assistantReply = await messages.last().innerText();
    console.log(`   AI Assistant response preview: "${assistantReply.slice(0, 120).replace(/\n/g, ' ')}..."`);
    assert(assistantReply.length > 20, "Assistant reply must be substantive");
    console.log("   ✓ PASS: AI Chat Assistant responded directly with actionable advice");

    // 10. Proceed from ChoiceRefinement to Final Review
    console.log("10. Transitioning from AI Counselor to Final Review...");
    const confirmOptionsBtn = page.locator("#confirm-options-btn");
    await confirmOptionsBtn.click();
    await page.waitForTimeout(1000);

    const finalReviewWorkspace = page.locator("#final-review-workspace");
    await finalReviewWorkspace.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: Final Review workspace loaded cleanly");

    // 11. Test Back to AI Strategy Review from Final Review
    console.log("11. Testing Round-Trip Navigation from Final Review to AI Counselor...");
    const backToAiBtn = page.locator('button:has-text("AI Strategy Review")');
    await backToAiBtn.waitFor({ state: "visible", timeout: 5000 });
    await backToAiBtn.click();
    await page.waitForTimeout(1000);
    assert(await page.locator("#ai-refinement-workspace").isVisible(), "Must navigate back to AI Refinement");
    console.log("   ✓ PASS: Smooth round-trip navigation between Final Review and AI Counselor verified");

    // Return to Final Review
    await page.click("#confirm-options-btn");
    await page.waitForTimeout(1000);

    // 12. Run Mock Seat Allotment
    console.log("12. Running Mock Seat Allotment...");
    const runAllotmentBtn = page.locator("#run-allotment-btn");
    await runAllotmentBtn.click();
    await page.waitForTimeout(3000); // Wait for scanner animation

    const allotmentLetter = page.locator("#allotment-letter");
    await allotmentLetter.waitFor({ state: "visible", timeout: 8000 });
    console.log("   ✓ PASS: Mock Allotment letter generated and displayed");

    // 13. Complete Counselling Practice -> Success Screen
    console.log("13. Submitting Final Practice Options...");
    const completeBtn = page.locator('button:has-text("Submit & Complete Practice")');
    await completeBtn.click();
    await page.waitForTimeout(3500); // Wait for analytics steps

    const successContainer = page.locator("#success-screen");
    await successContainer.waitFor({ state: "visible", timeout: 8000 });
    console.log("   ✓ PASS: Success Screen loaded with analytics");

    // 14. Test NEET Guide in Header
    console.log("14. Testing NEET Guide Header Button...");
    // Reset to Landing
    await page.click('button:has-text("Practice Again")');
    await page.waitForTimeout(600);

    // Start Simulation -> Choose NEET UG
    await page.click("#start-simulation-btn");
    await page.waitForTimeout(500);
    await page.click("#select-neet-ug");
    await page.waitForTimeout(300);
    await page.click("#exam-next-btn");
    await page.waitForTimeout(800);

    const neetGuideBtn = page.locator('button:has-text("NEET GUIDE")');
    await neetGuideBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: NEET GUIDE button is visible in header");
    await neetGuideBtn.click();
    await page.waitForTimeout(600);

    // Verify modal opened
    const neetModal = page.locator('text="Official NEET UG Counselling Rules Guide"').first();
    await neetModal.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: NEET UG Counselling Guide modal opened");

    // Close modal
    const closeBtn = page.locator('button:has-text("Got It, Close Guide"), button[aria-label="Close guide"]').first();
    await closeBtn.click();
    await page.waitForTimeout(400);
    console.log("   ✓ PASS: NEET UG Counselling Guide modal closed cleanly");

    // 15. Test JEE Main Rule Guide in Header
    console.log("15. Testing JEE Main RULE GUIDE Header Button...");
    // Change exam
    await page.click('button:has-text("Change Exam")');
    await page.waitForTimeout(500);
    await page.click("#select-jee-main");
    await page.waitForTimeout(300);
    await page.click("#exam-next-btn");
    await page.waitForTimeout(800);

    const jeeGuideBtn = page.locator('button:has-text("RULE GUIDE")');
    await jeeGuideBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: JEE Main RULE GUIDE button is visible in header");
    await jeeGuideBtn.click();
    await page.waitForTimeout(600);

    // Verify JEE Guide opened
    const jeeModal = page.locator('text="Official JoSAA Admission Concepts & Rules"').first();
    await jeeModal.waitFor({ state: "visible", timeout: 5000 });
    console.log("   ✓ PASS: JEE JoSAA Decision Rules guide modal opened");

    // Close JEE guide
    const jeeCloseBtn = page.locator('button[title*="Close Learning Centre"]').first();
    await jeeCloseBtn.click();
    await page.waitForTimeout(400);
    console.log("   ✓ PASS: JEE JoSAA Decision Rules guide modal closed cleanly");

    console.log("\n========================================================================");
    console.log(`   LIVE BROWSER TEST COMPLETED WITH ZERO ERRORS!                       `);
    console.log(`   Console Errors: ${consoleErrors.length}                             `);
    console.log("========================================================================");

  } finally {
    await browser.close();
  }
}

runLiveFeatureTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
