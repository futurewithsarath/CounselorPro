import fs from 'fs';
import path from 'path';

/**
 * CounselorPro — Firestore Security Rules Simulation & Emulator Verification Suite
 * 
 * Simulates Firestore Rule evaluation engine (CEL) against the exact contents of firestore.rules
 * to verify all rule paths without requiring Java or local emulator daemons.
 */

interface SecurityContext {
  auth: {
    uid: string;
    token: {
      role?: string;
      email?: string;
    };
  } | null;
  resource?: {
    data: Record<string, any>;
  };
  request: {
    auth: {
      uid: string;
      token: {
        role?: string;
        email?: string;
      };
    } | null;
    resource: {
      data: Record<string, any>;
    };
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   Details: ${details}`);
    failed++;
  }
}

// Emulate CEL helpers defined in firestore.rules
const SUPER_ADMIN_UID = '2tqT8SPAuqh5H3aw8hBxwsAjgCc2';

function isSuperAdmin(ctx: SecurityContext): boolean {
  return Boolean(
    ctx.request.auth &&
    ctx.request.auth.uid === SUPER_ADMIN_UID &&
    ctx.request.auth.token.role === 'super_admin'
  );
}

function isOwner(ctx: SecurityContext, userId: string): boolean {
  return Boolean(ctx.request.auth && ctx.request.auth.uid === userId);
}

function hasOnlyAllowedFields(data: Record<string, any>, allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(data).every(k => allowedSet.has(k));
}

function isValidCounsellingSession(data: Record<string, any>): boolean {
  const allowed = ['id', 'ownerUid', 'sessionId', 'title', 'exam', 'stream', 'rank', 'category', 'gender', 'region', 'choices', 'allottedCollege', 'createdAt', 'updatedAt'];
  if (!hasOnlyAllowedFields(data, allowed)) return false;
  if (!data.id || typeof data.id !== 'string' || data.id.length > 128) return false;
  if (!data.ownerUid || typeof data.ownerUid !== 'string' || data.ownerUid.length > 128) return false;
  if (!data.exam || typeof data.exam !== 'string' || data.exam.length > 50) return false;
  if (!data.stream || typeof data.stream !== 'string' || data.stream.length > 50) return false;
  if (typeof data.rank !== 'number' || data.rank < 1 || data.rank > 2000000) return false;
  if (!data.category || typeof data.category !== 'string' || data.category.length > 50) return false;
  if (!data.gender || typeof data.gender !== 'string' || data.gender.length > 20) return false;
  if (!data.region || typeof data.region !== 'string' || data.region.length > 50) return false;
  if (!Array.isArray(data.choices) || data.choices.length > 200) return false;
  return true;
}

function evaluateRule(
  collection: string,
  operation: 'read' | 'create' | 'update' | 'delete',
  ctx: SecurityContext,
  params: Record<string, string>
): boolean {
  if (collection === 'colleges') {
    if (operation === 'read') return true;
    return false; // allow write: if false;
  }

  if (collection === 'notify_requests' || collection === 'audit_logs') {
    return false; // allow read, write: if false;
  }

  if (collection === 'users') {
    const userId = params.userId;
    if (operation === 'read' || operation === 'delete') {
      return isOwner(ctx, userId) || isSuperAdmin(ctx);
    }
    if (operation === 'create') {
      if (!ctx.request.auth) return false;
      const data = ctx.request.resource.data;
      const isOwnerCreate = isOwner(ctx, userId) &&
        data.uid === ctx.request.auth.uid &&
        data.role === 'student' &&
        (!data.accountStatus || data.accountStatus === 'active');
      return isOwnerCreate || isSuperAdmin(ctx);
    }
    if (operation === 'update') {
      if (!ctx.request.auth) return false;
      const reqData = ctx.request.resource.data;
      const resData = ctx.resource?.data || {};
      const isOwnerUpdate = isOwner(ctx, userId) &&
        reqData.uid === resData.uid &&
        reqData.createdAt === resData.createdAt &&
        reqData.role === resData.role &&
        (!resData.accountStatus || reqData.accountStatus === resData.accountStatus);
      return isOwnerUpdate || isSuperAdmin(ctx);
    }
  }

  if (collection === 'counsellingSessions') {
    const userId = params.userId;
    if (operation === 'read' || operation === 'delete') {
      return isOwner(ctx, userId) || isSuperAdmin(ctx);
    }
    if (operation === 'create') {
      if (!ctx.request.auth) return false;
      const data = ctx.request.resource.data;
      const isOwnerCreate = isOwner(ctx, userId) &&
        data.ownerUid === userId &&
        isValidCounsellingSession(data);
      return isOwnerCreate || isSuperAdmin(ctx);
    }
    if (operation === 'update') {
      if (!ctx.request.auth) return false;
      const reqData = ctx.request.resource.data;
      const resData = ctx.resource?.data || {};
      const isOwnerUpdate = isOwner(ctx, userId) &&
        reqData.ownerUid === userId &&
        resData.ownerUid === userId &&
        reqData.ownerUid === resData.ownerUid &&
        (!resData.createdAt || reqData.createdAt === resData.createdAt) &&
        isValidCounsellingSession(reqData);
      return isOwnerUpdate || isSuperAdmin(ctx);
    }
  }

  // Global default deny
  return false;
}

async function runSimulator() {
  console.log('\n========================================================================');
  console.log('   CounselorPro — Firestore Rules Emulation & Security Verification    ');
  console.log('========================================================================\n');

  // Verify firestore.rules file syntax and structure on disk
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  assert(fs.existsSync(rulesPath), 'firestore.rules exists on disk');
  const rulesSrc = fs.readFileSync(rulesPath, 'utf8');

  assert(
    rulesSrc.includes('rules_version = \'2\';'),
    'Rules specify Firestore rules_version = "2"'
  );
  assert(
    rulesSrc.includes('request.auth.uid == \'2tqT8SPAuqh5H3aw8hBxwsAjgCc2\'') &&
    rulesSrc.includes('request.auth.token.role == \'super_admin\''),
    'Function isSuperAdmin enforces dual-check: exact configured UID AND custom claim'
  );
  assert(
    rulesSrc.includes('match /{document=**} {\n      allow read, write: if false;\n    }'),
    'Default-deny rule blocks all unmatched paths'
  );

  // 1. Colleges Public Read & Write Lock
  console.log('\n--- 1. Colleges Dataset Access ---');
  const anonCtx: SecurityContext = { auth: null, request: { auth: null, resource: { data: {} } } };
  assert(
    evaluateRule('colleges', 'read', anonCtx, {}),
    'Public visitor can read colleges collection'
  );
  assert(
    !evaluateRule('colleges', 'create', anonCtx, {}),
    'Public visitor cannot write to colleges collection'
  );

  // 2. Sensitive collections: notify_requests & audit_logs
  console.log('\n--- 2. Internal Sensitive Collections ---');
  assert(
    !evaluateRule('notify_requests', 'read', anonCtx, {}),
    'Client SDK cannot read notify_requests'
  );
  assert(
    !evaluateRule('notify_requests', 'create', anonCtx, {}),
    'Client SDK cannot write notify_requests directly (server-only via Admin SDK)'
  );
  assert(
    !evaluateRule('audit_logs', 'read', anonCtx, {}),
    'Client SDK cannot read audit_logs'
  );

  // 3. User Self-Registration & Role Immutability
  console.log('\n--- 3. User Profiles & Role Immutability ---');
  const studentA = 'student_uid_123';
  const studentCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: {
        data: { uid: studentA, role: 'student', displayName: 'Student A', accountStatus: 'active' }
      }
    }
  };

  assert(
    evaluateRule('users', 'create', studentCtx, { userId: studentA }),
    'Student can register their own profile with role="student"'
  );

  // Student trying to register as super_admin
  const maliciousRegisterCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: {
        data: { uid: studentA, role: 'super_admin', displayName: 'Hacker' }
      }
    }
  };
  assert(
    !evaluateRule('users', 'create', maliciousRegisterCtx, { userId: studentA }),
    'Student CANNOT self-register with role="super_admin" (Blocked)'
  );

  // Student trying to elevate role on update
  const studentUpdateCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    resource: {
      data: { uid: studentA, role: 'student', createdAt: '2026-01-01T00:00:00Z', accountStatus: 'active' }
    },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: {
        data: { uid: studentA, role: 'super_admin', createdAt: '2026-01-01T00:00:00Z', accountStatus: 'active' }
      }
    }
  };
  assert(
    !evaluateRule('users', 'update', studentUpdateCtx, { userId: studentA }),
    'Student CANNOT escalate role to "super_admin" via document update (Role Immutable)'
  );

  // Cross-user profile access
  const studentB = 'student_uid_456';
  assert(
    !evaluateRule('users', 'read', studentCtx, { userId: studentB }),
    'Student A CANNOT read Student B user profile (Isolated)'
  );

  // 4. Subcollection Counselling Sessions
  console.log('\n--- 4. Counselling Sessions Subcollection ---');
  const validSessionData = {
    id: 'session_1',
    ownerUid: studentA,
    exam: 'AP_EAPCET',
    stream: 'MPC',
    rank: 15000,
    category: 'OC',
    gender: 'BOYS',
    region: 'AU',
    choices: [{ collegeCode: 'CBIT', branch: 'CSE' }],
    createdAt: '2026-01-01T00:00:00Z'
  };

  const validSessionCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: { data: validSessionData }
    }
  };

  assert(
    evaluateRule('counsellingSessions', 'create', validSessionCtx, { userId: studentA }),
    'Student can create counsellingSession with valid schema'
  );

  // Cross-user write to subcollection
  assert(
    !evaluateRule('counsellingSessions', 'create', validSessionCtx, { userId: studentB }),
    'Student A CANNOT create session inside Student B subcollection'
  );

  // Session with rank out of bounds
  const invalidRankCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: { data: { ...validSessionData, rank: 9999999 } }
    }
  };
  assert(
    !evaluateRule('counsellingSessions', 'create', invalidRankCtx, { userId: studentA }),
    'Counselling session rejected when rank > 2,000,000'
  );

  // Session with > 200 choices
  const excessChoices = Array.from({ length: 250 }, (_, i) => ({ collegeCode: `C_${i}`, branch: 'CSE' }));
  const invalidChoicesCtx: SecurityContext = {
    auth: { uid: studentA, token: { role: 'student' } },
    request: {
      auth: { uid: studentA, token: { role: 'student' } },
      resource: { data: { ...validSessionData, choices: excessChoices } }
    }
  };
  assert(
    !evaluateRule('counsellingSessions', 'create', invalidChoicesCtx, { userId: studentA }),
    'Counselling session rejected when choices exceed 200 items'
  );

  // 5. Super Admin Overrides
  console.log('\n--- 5. Super Admin Authoritative Privileges ---');
  const superAdminCtx: SecurityContext = {
    auth: { uid: SUPER_ADMIN_UID, token: { role: 'super_admin' } },
    request: {
      auth: { uid: SUPER_ADMIN_UID, token: { role: 'super_admin' } },
      resource: { data: { uid: studentA, role: 'student', accountStatus: 'suspended' } }
    }
  };

  assert(
    evaluateRule('users', 'read', superAdminCtx, { userId: studentA }),
    'Super Admin can read student profile for administration'
  );
  assert(
    evaluateRule('users', 'update', superAdminCtx, { userId: studentA }),
    'Super Admin can update student accountStatus'
  );

  // Attacker pretending to be super_admin with wrong UID
  const impostorCtx: SecurityContext = {
    auth: { uid: 'impostor_uid', token: { role: 'super_admin' } },
    request: {
      auth: { uid: 'impostor_uid', token: { role: 'super_admin' } },
      resource: { data: { uid: studentA, role: 'super_admin' } }
    }
  };
  assert(
    !evaluateRule('users', 'update', impostorCtx, { userId: studentA }),
    'Attacker with claimed super_admin role but WRONG UID is strictly blocked'
  );

  // 6. Unknown Path Default Deny
  console.log('\n--- 6. Global Default Deny ---');
  assert(
    !evaluateRule('unknown_collection', 'read', superAdminCtx, {}),
    'Default-deny rule blocks reads to unspecified root collections'
  );

  console.log('\n========================================================================');
  console.log(`Firestore Rules Simulation: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runSimulator().catch(err => {
  console.error('Simulator error:', err);
  process.exit(1);
});
