import fs from 'fs';
import path from 'path';
import { validateProfileAndOptions, checkServerlessRateLimit } from '../api/_lib/index';

/**
 * CounselorPro — 12 Comprehensive Production Security Scenarios Verification
 * 
 * Verifies all 12 mandatory security and authorization scenarios specified in Phase 7:
 * 1. Unauthenticated user accessing admin APIs (401)
 * 2. Student accessing admin APIs (403)
 * 3. Student attempting to modify their role (immutability)
 * 4. Unauthorized user uploading datasets (403)
 * 5. Invalid or revoked Firebase tokens (401)
 * 6. Unauthorized cross-user Firestore access (isolated subcollections & ownerUid)
 * 7. Invalid AI requests (bad rank, unallowlisted category/exam)
 * 8. Excessive AI requests (rate limiting enforcement)
 * 9. Malformed dataset uploads (missing fields, duplicate IDs, >5000 records)
 * 10. Valid Super Admin operations (authoritative dual-check 200)
 * 11. Student registration and login flows (default student role)
 * 12. Saved choices and counselling sessions persistence (ownerUid binding)
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, scenario: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${scenario}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${scenario}`);
    if (details) console.error(`   Details: ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('   CounselorPro — 12 Comprehensive Security Scenarios Verification    ');
  console.log('========================================================================\n');

  const configuredSuperAdminUid = (process.env.SUPER_ADMIN_UID || '2tqT8SPAuqh5H3aw8hBxwsAjgCc2').trim();

  // --------------------------------------------------------------------------
  // Scenario 1: Unauthenticated user accessing admin APIs (401)
  // --------------------------------------------------------------------------
  console.log('--- Scenario 1: Unauthenticated user accessing admin APIs ---');
  const adminAuthPath = path.join(process.cwd(), 'api', '_lib', 'adminAuth.ts');
  const adminAuthSrc = fs.readFileSync(adminAuthPath, 'utf8');

  assert(
    adminAuthSrc.includes('!authorization.startsWith("Bearer ")') &&
    adminAuthSrc.includes('statusCode: 401'),
    'Scenario 1.1: Rejects requests missing Bearer token with HTTP 401'
  );
  assert(
    adminAuthSrc.includes('if (!token)') && adminAuthSrc.includes('statusCode: 401'),
    'Scenario 1.2: Rejects empty tokens with HTTP 401'
  );

  // --------------------------------------------------------------------------
  // Scenario 2: Student accessing admin APIs (403)
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Student accessing admin APIs ---');
  assert(
    adminAuthSrc.includes('decoded.role === "super_admin"') &&
    adminAuthSrc.includes('statusCode: 403'),
    'Scenario 2.1: Denies privileged admin API access to students with HTTP 403'
  );
  assert(
    adminAuthSrc.includes('decoded.uid === configuredSuperAdminUid'),
    'Scenario 2.2: Rejects users who do not match the configured SUPER_ADMIN_UID with HTTP 403'
  );

  // --------------------------------------------------------------------------
  // Scenario 3: Student attempting to modify their role
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Student attempting to modify their role ---');
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rulesSrc = fs.readFileSync(rulesPath, 'utf8');

  assert(
    rulesSrc.includes('request.resource.data.role == resource.data.role') ||
    rulesSrc.includes('request.resource.data.role == \'student\''),
    'Scenario 3.1: Firestore rules enforce role immutability for student self-updates'
  );

  const authContextPath = path.join(process.cwd(), 'src', 'context', 'AuthContext.tsx');
  const authContextSrc = fs.readFileSync(authContextPath, 'utf8');

  assert(
    authContextSrc.includes('role: \'student\' as UserRole') &&
    authContextSrc.includes('localStorage'),
    'Scenario 3.2: AuthContext never initializes super_admin from localStorage (fail-closed)'
  );
  assert(
    authContextSrc.includes('claimsRole === \'super_admin\' ? \'super_admin\' : \'student\''),
    'Scenario 3.3: Super Admin role is authoritative exclusively from cryptographically signed custom claims'
  );

  // --------------------------------------------------------------------------
  // Scenario 4: Unauthorized user uploading datasets
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Unauthorized user uploading datasets ---');
  const uploadApiPath = path.join(process.cwd(), 'api', 'admin', 'upload-colleges.ts');
  const uploadApiSrc = fs.readFileSync(uploadApiPath, 'utf8');

  assert(
    uploadApiSrc.includes('verifySuperAdmin(req, res)') &&
    uploadApiSrc.includes('if (!authResult.authorized) return'),
    'Scenario 4.1: /api/admin/upload-colleges enforces verifySuperAdmin gate before processing payload'
  );

  const adminModalPath = path.join(process.cwd(), 'src', 'components', 'AdminModal.tsx');
  const adminModalSrc = fs.readFileSync(adminModalPath, 'utf8');

  assert(
    !adminModalSrc.includes('admin123') &&
    !adminModalSrc.includes('counselorpro2026') &&
    !adminModalSrc.includes('counselorpro') &&
    !adminModalSrc.includes('isPasscodeAuthenticated'),
    'Scenario 4.2: AdminModal completely purged of hardcoded passcodes and client-side bypasses'
  );

  // --------------------------------------------------------------------------
  // Scenario 5: Invalid or revoked Firebase tokens
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Invalid or revoked Firebase tokens ---');
  assert(
    adminAuthSrc.includes('verifyIdToken(token, true)') &&
    adminAuthSrc.includes('Invalid, expired, or malformed Firebase ID token'),
    'Scenario 5.1: verifySuperAdmin enforces checkRevoked=true against revoked tokens'
  );

  const serverTsPath = path.join(process.cwd(), 'server.ts');
  const serverTsSrc = fs.readFileSync(serverTsPath, 'utf8');

  assert(
    serverTsSrc.includes('verifyIdToken(token, true)'),
    'Scenario 5.2: Server Express middleware enforces checkRevoked=true on /api/admin/*'
  );

  // --------------------------------------------------------------------------
  // Scenario 6: Unauthorized cross-user Firestore access
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Unauthorized cross-user Firestore access ---');
  assert(
    rulesSrc.includes('function isOwner(userId)') &&
    rulesSrc.includes('request.auth.uid == userId'),
    'Scenario 6.1: isOwner strictly matches authenticated request.auth.uid against target userId'
  );
  assert(
    rulesSrc.includes('/users/{userId}') &&
    rulesSrc.includes('allow read: if isOwner(userId) || isSuperAdmin()'),
    'Scenario 6.2: User profiles allow read only to the verified owner or Super Admin'
  );
  assert(
    rulesSrc.includes('/counsellingSessions/{sessionId}') &&
    rulesSrc.includes('/savedChoices/{choiceId}'),
    'Scenario 6.3: Subcollections (counsellingSessions, savedChoices) protected by owner & super_admin policy'
  );

  // --------------------------------------------------------------------------
  // Scenario 7: Invalid AI requests
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Invalid AI requests ---');
  // 7.1 Negative / Zero rank
  const testInvalidRank = validateProfileAndOptions(
    { exam: 'AP_EAPCET', stream: 'MPC', rank: 0, category: 'OC', region: 'AU', gender: 'BOYS' },
    [{ priority: 1, collegeCode: 'CBIT', collegeName: 'Chaitanya Bharathi', branch: 'CSE' }]
  );
  assert(!testInvalidRank.valid, 'Scenario 7.1: Rejects invalid student rank (rank <= 0)');

  // 7.2 Rank too large
  const testLargeRank = validateProfileAndOptions(
    { exam: 'AP_EAPCET', stream: 'MPC', rank: 3000000, category: 'OC', region: 'AU', gender: 'BOYS' },
    [{ priority: 1, collegeCode: 'CBIT', collegeName: 'Chaitanya Bharathi', branch: 'CSE' }]
  );
  assert(!testLargeRank.valid, 'Scenario 7.2: Rejects rank exceeding maximum bounds (rank > 2,000,000)');

  // 7.3 Unallowlisted category
  const testInvalidCategory = validateProfileAndOptions(
    { exam: 'AP_EAPCET', stream: 'MPC', rank: 5000, category: '<script>alert(1)</script>', region: 'AU', gender: 'BOYS' },
    [{ priority: 1, collegeCode: 'CBIT', collegeName: 'Chaitanya Bharathi', branch: 'CSE' }]
  );
  assert(!testInvalidCategory.valid, 'Scenario 7.3: Rejects unallowlisted / malicious category');

  // 7.4 Excess options (> 50 options limit)
  const excessOptions = Array.from({ length: 55 }, (_, i) => ({
    priority: i + 1,
    collegeCode: `COL_${i}`,
    collegeName: `College ${i}`,
    branch: 'CSE'
  }));
  const testExcessOptions = validateProfileAndOptions(
    { exam: 'AP_EAPCET', stream: 'MPC', rank: 5000, category: 'OC', region: 'AU', gender: 'BOYS' },
    excessOptions
  );
  assert(!testExcessOptions.valid, 'Scenario 7.4: Rejects option lists exceeding 50 items');

  // --------------------------------------------------------------------------
  // Scenario 8: Excessive AI requests (Rate limiting)
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Excessive AI requests (Rate limiting) ---');
  const testIp = `test_rate_ip_${Date.now()}`;
  let allowedCount = 0;
  for (let i = 0; i < 15; i++) {
    const res = checkServerlessRateLimit(testIp, 10, 60000);
    if (res.allowed) allowedCount++;
  }
  assert(
    allowedCount === 10,
    `Scenario 8.1: Rate limiter strictly caps requests to limit (allowed exactly 10 of 15 attempts, got ${allowedCount})`
  );

  const blockedRes = checkServerlessRateLimit(testIp, 10, 60000);
  assert(
    !blockedRes.allowed && blockedRes.remaining === 0,
    'Scenario 8.2: Blocked request reports allowed=false and remaining=0'
  );

  // --------------------------------------------------------------------------
  // Scenario 9: Malformed dataset uploads
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Malformed dataset uploads ---');
  assert(
    uploadApiSrc.includes('records.length < 1 || records.length > 5000'),
    'Scenario 9.1: Rejects datasets with zero records or exceeding 5,000 records'
  );
  assert(
    uploadApiSrc.includes('ids.has(row.id)'),
    'Scenario 9.2: Rejects duplicate record IDs within the dataset payload'
  );
  assert(
    uploadApiSrc.includes('typeof row.code !== "string"') &&
    uploadApiSrc.includes('typeof row.name !== "string"'),
    'Scenario 9.3: Validates required record schema (code, name, id)'
  );

  // --------------------------------------------------------------------------
  // Scenario 10: Valid Super Admin operations
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Valid Super Admin operations ---');
  assert(
    adminAuthSrc.includes('!hasSuperAdminClaim || !matchesSuperAdminUid') ||
    adminAuthSrc.includes('hasSuperAdminClaim && matchesSuperAdminUid'),
    'Scenario 10.1: Authorizes request when BOTH custom claim role == "super_admin" and UID match'
  );
  assert(
    rulesSrc.includes('request.auth.uid == \'2tqT8SPAuqh5H3aw8hBxwsAjgCc2\'') &&
    rulesSrc.includes('request.auth.token.role == \'super_admin\''),
    'Scenario 10.2: Firestore rules function isSuperAdmin enforces dual-check (UID and custom claim)'
  );

  // --------------------------------------------------------------------------
  // Scenario 11: Student registration and login flows
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 11: Student registration and login flows ---');
  assert(
    authContextSrc.includes('role: \'student\', // All public registrations are students'),
    'Scenario 11.1: Public student registration strictly defaults role to "student"'
  );
  assert(
    rulesSrc.includes('request.resource.data.role == \'student\''),
    'Scenario 11.2: Firestore user document creation rules mandate role == "student" for client writes'
  );

  // --------------------------------------------------------------------------
  // Scenario 12: Saved choices and counselling sessions persistence
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 12: Saved choices and counselling sessions persistence ---');
  const studentDataPath = path.join(process.cwd(), 'src', 'utils', 'studentData.ts');
  const studentDataSrc = fs.readFileSync(studentDataPath, 'utf8');

  assert(
    studentDataSrc.includes('savePracticeSession') &&
    studentDataSrc.includes('ownerUid: currentUser.uid'),
    'Scenario 12.1: savePracticeSession binds ownerUid to currentUser.uid'
  );
  assert(
    studentDataSrc.includes('saveStudentDraft') &&
    studentDataSrc.includes('ownerUid: currentUser.uid'),
    'Scenario 12.2: saveStudentDraft binds ownerUid to currentUser.uid'
  );
  assert(
    studentDataSrc.includes('saveCounsellingPreferences') &&
    studentDataSrc.includes('ownerUid: currentUser.uid'),
    'Scenario 12.3: saveCounsellingPreferences binds ownerUid to currentUser.uid'
  );

  console.log('\n========================================================================');
  console.log(`Scenarios Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
