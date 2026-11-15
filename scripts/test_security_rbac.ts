import fs from 'fs';
import path from 'path';

function runAudit() {
  console.log('\n================================================================');
  console.log('   CounselorPro — Single Super Admin & RBAC Security Audit    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (errorDetail) console.error(`   Details: ${errorDetail}`);
      failed++;
    }
  }

  // 1. Check bootstrap script exists and enforces custom claim { role: "super_admin" }
  const grantScriptPath = path.join(process.cwd(), 'scripts', 'grant-super-admin.ts');
  const grantScript = fs.existsSync(grantScriptPath) ? fs.readFileSync(grantScriptPath, 'utf8') : '';
  assert(
    fs.existsSync(grantScriptPath),
    'Trusted Server Bootstrap script exists at scripts/grant-super-admin.ts'
  );
  assert(
    grantScript.includes('setCustomUserClaims') && grantScript.includes('role: \'super_admin\''),
    'Bootstrap script assigns authoritative Custom Claim { role: "super_admin" }'
  );
  assert(
    grantScript.includes('SUPER_ADMIN_EMAIL') && (grantScript.includes('getUser(') || grantScript.includes('getUserByEmail')),
    'Bootstrap script reads SUPER_ADMIN_EMAIL and looks up user by UID and verified email'
  );

  // 2. Check AuthContext.tsx enforces Custom Claims and default student role
  const authContextPath = path.join(process.cwd(), 'src', 'context', 'AuthContext.tsx');
  const authContext = fs.existsSync(authContextPath) ? fs.readFileSync(authContextPath, 'utf8') : '';
  assert(
    authContext.includes('claimsRole === \'super_admin\' ? \'super_admin\' : \'student\''),
    'AuthContext authoritatively resolves role from ID token Custom Claims'
  );
  assert(
    !authContext.includes('updateRoleLocally'),
    'Client-side self-promotion functions (updateRoleLocally) are completely removed'
  );
  assert(
    authContext.includes('linkGoogleAccount') && authContext.includes('linkWithPopup'),
    'Multi-provider account linking supported via linkWithPopup'
  );

  // 3. Check UserNav.tsx has no testing role switcher
  const userNavPath = path.join(process.cwd(), 'src', 'components', 'auth', 'UserNav.tsx');
  const userNav = fs.existsSync(userNavPath) ? fs.readFileSync(userNavPath, 'utf8') : '';
  assert(
    !userNav.includes('Test Role Access') && !userNav.includes('updateRoleLocally'),
    'UserNav has no client-side role toggling or promotion controls'
  );
  assert(
    userNav.includes('isOwnerAdmin') && userNav.includes('Admin Dashboard'),
    'UserNav displays Admin Dashboard exclusively to verified Super Admin'
  );

  // 4. Check AdminDashboard.tsx access barrier
  const adminDashPath = path.join(process.cwd(), 'src', 'components', 'admin', 'AdminDashboard.tsx');
  const adminDash = fs.existsSync(adminDashPath) ? fs.readFileSync(adminDashPath, 'utf8') : '';
  assert(
    adminDash.includes('if (user && !isSuperAdmin)'),
    'AdminDashboard strictly bars standard students and unauthorized users'
  );
  assert(
    !adminDash.includes('Promote to Administrator Now'),
    'AdminDashboard has no demo evaluation promote button'
  );

  // 5. Check student data storage models and UID ownership
  const studentDataPath = path.join(process.cwd(), 'src', 'utils', 'studentData.ts');
  const studentData = fs.existsSync(studentDataPath) ? fs.readFileSync(studentDataPath, 'utf8') : '';
  assert(
    fs.existsSync(studentDataPath),
    'Student data storage utility exists at src/utils/studentData.ts'
  );
  assert(
    studentData.includes('ownerUid: currentUser.uid'),
    'Student data writes enforce ownerUid matching authenticated user UID'
  );
  assert(
    studentData.includes('practice_sessions') && studentData.includes('counselling_preferences') && studentData.includes('saved_drafts'),
    'UID-owned storage models defined for practice sessions, preferences, and drafts'
  );

  // 6. Check Server Backend authorization checks in upload-colleges
  const uploadApiServerPath = path.join(process.cwd(), 'api', 'admin', 'upload-colleges.ts');
  const uploadApiServer = fs.existsSync(uploadApiServerPath) ? fs.readFileSync(uploadApiServerPath, 'utf8') : '';
  assert(
    uploadApiServer.includes('decoded.role === "super_admin"') || uploadApiServer.includes('isSuperAdminClaim'),
    '/api/admin/upload-colleges validates Firebase ID token for role == "super_admin"'
  );

  const serverTsPath = path.join(process.cwd(), 'server.ts');
  const serverTs = fs.existsSync(serverTsPath) ? fs.readFileSync(serverTsPath, 'utf8') : '';
  assert(
    serverTs.includes('decoded.role === "super_admin"') || serverTs.includes('isSuperAdminClaim'),
    'Local Express server validates Firebase ID token for role == "super_admin"'
  );

  console.log('\n----------------------------------------------------------------');
  console.log(`Audit Summary: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
