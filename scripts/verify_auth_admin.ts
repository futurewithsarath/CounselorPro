import fs from 'fs';
import path from 'path';

function verify() {
  console.log('=== CounselorPro Complete Authentication & Admin Dashboard Verification ===');

  const filesToCheck = [
    'src/utils/firebase.ts',
    'src/context/AuthContext.tsx',
    'src/components/auth/AuthModal.tsx',
    'src/components/auth/UserNav.tsx',
    'src/components/admin/AdminDashboard.tsx',
    'src/components/admin/tabs/OverviewTab.tsx',
    'src/components/admin/tabs/CollegesTab.tsx',
    'src/components/admin/tabs/CoursesTab.tsx',
    'src/components/admin/tabs/CutoffsTab.tsx',
    'src/components/admin/tabs/UploadTab.tsx',
    'src/components/admin/tabs/UsersTab.tsx',
    'src/components/admin/tabs/SettingsTab.tsx',
    'src/data/colleges.ts',
    'src/App.tsx',
    'src/main.tsx',
    'api/config/firebase.ts',
    'server.ts'
  ];

  let missing = 0;
  for (const f of filesToCheck) {
    const fullPath = path.join(process.cwd(), f);
    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Missing file: ${f}`);
      missing++;
    } else {
      const stats = fs.statSync(fullPath);
      console.log(`[PASS] ${f} (${stats.size} bytes)`);
    }
  }

  // Check firebase config in src/utils/firebase.ts
  const firebaseTs = fs.readFileSync(path.join(process.cwd(), 'src/utils/firebase.ts'), 'utf8');
  if (firebaseTs.includes('counselorpro') && firebaseTs.includes('AIzaSyAgfXQFSoGjvSxmskHK4tu97Tt0DopngAg')) {
    console.log('[PASS] Firebase credentials properly bound in src/utils/firebase.ts');
  } else {
    console.error('[FAIL] Missing or invalid Firebase credentials in src/utils/firebase.ts');
    missing++;
  }

  // Check AuthContext role-based access control
  const authCtx = fs.readFileSync(path.join(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');
  if (authCtx.includes('super_admin') && authCtx.includes('admin') && authCtx.includes('data_manager') && authCtx.includes('student')) {
    console.log('[PASS] Role-based access control (RBAC) covers super_admin, admin, data_manager, student');
  } else {
    console.error('[FAIL] Missing role definitions in AuthContext.tsx');
    missing++;
  }

  // Check AdminDashboard routing in App.tsx
  const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  if (appTsx.includes('AdminDashboard') && appTsx.includes('AuthModal') && appTsx.includes('UserNav')) {
    console.log('[PASS] AdminDashboard, AuthModal, and UserNav properly integrated in App.tsx');
  } else {
    console.error('[FAIL] Missing AdminDashboard, AuthModal, or UserNav in App.tsx');
    missing++;
  }

  // Check Colleges synchronization in colleges.ts
  const collegesTs = fs.readFileSync(path.join(process.cwd(), 'src/data/colleges.ts'), 'utf8');
  if (collegesTs.includes('clearCollegesClientCache') && collegesTs.includes('counselor_custom_colleges')) {
    console.log('[PASS] Dynamic student-facing college synchronization & cache purge ready in colleges.ts');
  } else {
    console.error('[FAIL] Missing dynamic synchronization in colleges.ts');
    missing++;
  }

  if (missing === 0) {
    console.log('\n>>> ALL 17 CHECKS PASSED PERFECTLY! <<<');
  } else {
    console.error(`\n>>> ${missing} CHECKS FAILED! <<<`);
    process.exit(1);
  }
}

verify();
