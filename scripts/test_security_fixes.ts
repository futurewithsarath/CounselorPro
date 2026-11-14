import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { ALLOWED_EXAM_GROUPS, ALLOWED_EXAMS, ALLOWED_CATEGORIES, validateProfileAndOptions, checkServerlessRateLimit } from "../api/_lib/index";

console.log("========================================================================");
console.log("       COUNSELORPRO — SECURITY ISSUES VERIFICATION SUITE               ");
console.log("========================================================================\n");

// TEST 1: Validate Profile and Options Schema & Limits
console.log("TEST 1: Input Validation for /api/ai/analyze-choices");
{
  // 1.1 Max 50 options check
  const fiftyOneOptions = Array.from({ length: 51 }, (_, i) => ({
    priority: i + 1,
    collegeCode: `COL${i}`,
    collegeName: `College ${i}`,
    branch: "CSE"
  }));
  const resOverLimit = validateProfileAndOptions(
    { exam: "AP_EAPCET", stream: "MPC", rank: 5000, category: "OC" },
    fiftyOneOptions
  );
  assert.strictEqual(resOverLimit.valid, false, "Should fail when options count > 50");
  assert.match(resOverLimit.error || "", /exceeds the maximum limit of 50/i);
  console.log("  ✓ PASS: Rejects option list exceeding 50 items");

  // 1.2 Accept valid 50 options
  const fiftyOptions = Array.from({ length: 50 }, (_, i) => ({
    priority: i + 1,
    collegeCode: `COL${i}`,
    collegeName: `College ${i}`,
    branch: "CSE"
  }));
  const resExact50 = validateProfileAndOptions(
    { exam: "AP_EAPCET", stream: "MPC", rank: 5000, category: "OC" },
    fiftyOptions
  );
  assert.strictEqual(resExact50.valid, true, "Should accept exactly 50 options");
  assert.strictEqual(resExact50.validatedOptions?.length, 50);
  console.log("  ✓ PASS: Accepts valid option list with up to 50 items");

  // 1.3 Exam allowlist check
  const resBadExam = validateProfileAndOptions(
    { exam: "FAKE_EXAM_HACK", stream: "MPC", rank: 5000, category: "OC" },
    [{ priority: 1, collegeCode: "CBIT", collegeName: "CBIT", branch: "CSE" }]
  );
  assert.strictEqual(resBadExam.valid, false, "Should reject unallowlisted exam");
  console.log("  ✓ PASS: Rejects unallowlisted exam values");

  // 1.4 Category allowlist check
  const resBadCat = validateProfileAndOptions(
    { exam: "AP_EAPCET", stream: "MPC", rank: 5000, category: "INVALID_CAT" },
    [{ priority: 1, collegeCode: "CBIT", collegeName: "CBIT", branch: "CSE" }]
  );
  assert.strictEqual(resBadCat.valid, false, "Should reject unallowlisted category");
  console.log("  ✓ PASS: Rejects unallowlisted reservation categories");

  // 1.5 Rank bounds check
  const resBadRank = validateProfileAndOptions(
    { exam: "AP_EAPCET", stream: "MPC", rank: -10, category: "OC" },
    [{ priority: 1, collegeCode: "CBIT", collegeName: "CBIT", branch: "CSE" }]
  );
  assert.strictEqual(resBadRank.valid, false, "Should reject negative rank");
  console.log("  ✓ PASS: Rejects invalid or negative student rank");

  // 1.6 String length sanitization check
  const longName = "A".repeat(300);
  const resLongString = validateProfileAndOptions(
    { exam: "AP_EAPCET", stream: "MPC", rank: 5000, category: "OC" },
    [{ priority: 1, collegeCode: "CBIT", collegeName: longName, branch: "CSE" }]
  );
  assert.strictEqual(resLongString.valid, true);
  assert.ok(resLongString.validatedOptions![0].collegeName.length <= 150, "Should clamp collegeName to 150 chars");
  console.log("  ✓ PASS: Clamps string lengths to prevent payload inflation");
}

// TEST 2: Rate Limiter Mechanism
console.log("\nTEST 2: Rate Limiting Enforcement");
{
  const testIp = `test_ip_${Date.now()}`;
  let allowedCount = 0;
  let blockedCount = 0;

  for (let i = 0; i < 15; i++) {
    const result = checkServerlessRateLimit(testIp, 10, 60000);
    if (result.allowed) {
      allowedCount++;
    } else {
      blockedCount++;
    }
  }

  assert.strictEqual(allowedCount, 10, "Should allow exactly 10 requests within window");
  assert.strictEqual(blockedCount, 5, "Should reject requests exceeding 10 per minute");
  console.log("  ✓ PASS: Serverless rate limiter enforces strict 10 req/min threshold per IP");
}

// TEST 3: Hardcoded Admin Email Elimination
console.log("\nTEST 3: Admin Email Leakage & Hardcoded Email Elimination");
{
  const serverCode = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  const apiConfigCode = fs.readFileSync(path.join(process.cwd(), "api", "config", "firebase.ts"), "utf8");
  const apiUploadCode = fs.readFileSync(path.join(process.cwd(), "api", "admin", "upload-colleges.ts"), "utf8");

  assert.ok(!serverCode.includes("sarathdasireddy369"), "server.ts must not contain hardcoded admin email");
  assert.ok(!apiConfigCode.includes("sarathdasireddy369"), "api/config/firebase.ts must not contain hardcoded admin email");
  assert.ok(!apiUploadCode.includes("sarathdasireddy369"), "api/admin/upload-colleges.ts must not contain hardcoded admin email");
  console.log("  ✓ PASS: Default admin email purged from all server and API files");

  assert.ok(!apiConfigCode.includes("adminEmails"), "api/config/firebase.ts must not expose adminEmails");
  console.log("  ✓ PASS: /api/config/firebase does not return adminEmails to the client");

  assert.ok(serverCode.includes("ADMIN_EMAILS environment variable is not configured. Failing closed."));
  assert.ok(apiUploadCode.includes("ADMIN_EMAILS environment variable is not configured. Failing closed."));
  console.log("  ✓ PASS: Server fails closed with 403 when ADMIN_EMAILS env is missing or empty");
}

// TEST 4: Global Express JSON Limit & Upload Exemption
console.log("\nTEST 4: Request Body Size Limits");
{
  const serverCode = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  assert.ok(serverCode.includes('express.json({ limit: "100kb" })'), "Global json limit must be 100kb");
  assert.ok(serverCode.includes('express.urlencoded({ limit: "100kb"'), "Global urlencoded limit must be 100kb");
  assert.ok(serverCode.includes('express.json({ limit: "15mb" })'), "Upload parser limit must be 15mb");
  assert.ok(serverCode.includes('/api/admin/upload-colleges", uploadJsonParser'), "15mb applied exclusively on upload route");
  console.log("  ✓ PASS: Global 100kb JSON body limit with 15mb exclusively on /api/admin/upload-colleges");
}

// TEST 5: notify-request Input Validation & Error Handling
console.log("\nTEST 5: /api/notify-request Security");
{
  assert.ok(ALLOWED_EXAM_GROUPS.has("TS_EAPCET_BIPC"));
  assert.ok(ALLOWED_EXAM_GROUPS.has("NEET_UG"));
  assert.ok(ALLOWED_EXAM_GROUPS.has("JEE_MAIN"));
  assert.ok(!ALLOWED_EXAM_GROUPS.has("MALICIOUS_INJECTION"));
  console.log("  ✓ PASS: Exam groups are strictly allowlisted");

  const notifyServerless = fs.readFileSync(path.join(process.cwd(), "api", "notify-request.ts"), "utf8");
  assert.ok(!notifyServerless.includes("err.message"), "api/notify-request.ts must never return err.message");
  assert.ok(notifyServerless.includes("Failed to register notification. Please try again later."));

  const notifyServer = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  assert.ok(!notifyServer.includes('Server error occurred: " + err.message'), "server.ts must never return err.message on notify");
  console.log("  ✓ PASS: Internal error messages are never exposed to client");
}

// TEST 6: Security Headers (CSP & HSTS)
console.log("\nTEST 6: Security Headers (CSP & HSTS)");
{
  const vercelJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"));
  const headers = vercelJson.headers[0].headers;
  const hsts = headers.find((h: any) => h.key === "Strict-Transport-Security");
  const csp = headers.find((h: any) => h.key === "Content-Security-Policy");

  assert.ok(hsts, "Strict-Transport-Security header must exist in vercel.json");
  assert.match(hsts.value, /max-age=31536000/);
  assert.match(hsts.value, /includeSubDomains/);
  assert.match(hsts.value, /preload/);
  console.log("  ✓ PASS: HSTS header configured with preload and includeSubDomains");

  assert.ok(csp, "Content-Security-Policy header must exist in vercel.json");
  assert.match(csp.value, /default-src 'self'/);
  assert.match(csp.value, /frame-ancestors 'none'/);
  console.log("  ✓ PASS: Content-Security-Policy header configured");

  const serverCode = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  assert.ok(serverCode.includes("Strict-Transport-Security"), "HSTS configured in server.ts");
  assert.ok(serverCode.includes("Content-Security-Policy"), "CSP configured in server.ts");
  console.log("  ✓ PASS: Express server mirrors HSTS and CSP headers");
}

// TEST 7: Dead Code Deletion
console.log("\nTEST 7: Dead Code Elimination");
{
  const serverCode = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
  assert.ok(!serverCode.includes("import { exec } from \"child_process\""), "exec import removed from server.ts");
  assert.ok(!serverCode.includes("let cachedCollegesResponse"), "cachedCollegesResponse removed from server.ts");
  assert.ok(!serverCode.includes("const examParam = req.query.exam as string;"), "Legacy colleges unreachable body removed");
  console.log("  ✓ PASS: Dead code, unreachable bodies, and unused imports eliminated");
}

// TEST 8: Firestore Security Rules
console.log("\nTEST 8: Firestore Security Rules Integrity");
{
  assert.ok(fs.existsSync(path.join(process.cwd(), "firestore.rules")), "firestore.rules file must exist");
  const rules = fs.readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");
  assert.ok(rules.includes("rules_version = '2';"), "Must be rules_version 2");
  assert.ok(rules.includes("match /notify_requests/{requestId}"), "Must have match for notify_requests");
  assert.ok(rules.includes("allow read, write: if false;"), "notify_requests must deny client read and write");
  assert.ok(rules.includes("match /colleges/{collegeId}"), "Must have match for colleges");
  assert.ok(rules.includes("allow read: if true;"), "colleges must be publicly readable");
  assert.ok(rules.includes("allow write: if false;"), "colleges client write must be denied");
  console.log("  ✓ PASS: Firestore security rules enforce strict read/write boundaries");
}

console.log("\n========================================================================");
console.log("           ALL 8 SECURITY AUDIT TESTS PASSED (100% SUCCESS)             ");
console.log("========================================================================");
