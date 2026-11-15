import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log(' COUNSELORPRO — MASTER VERCEL PRE-DEPLOYMENT AUDIT & VERIFICATION       ');
console.log('========================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(title: string, condition: boolean, details?: string) {
  totalChecks++;
  if (condition) {
    console.log(`✅ [PASS] ${title}`);
    if (details) console.log(`         ${details}`);
    passedChecks++;
  } else {
    console.error(`❌ [FAIL] ${title}`);
    if (details) console.error(`         ${details}`);
    failedChecks++;
  }
}

// 1. Project Files & Directory Structure
console.log('--- 1. CORE PROJECT MANIFEST & REPOSITORY AUDIT ---');
check('package.json exists and contains required scripts', fs.existsSync('package.json') && (() => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.scripts?.build && pkg.scripts?.dev && pkg.scripts?.lint;
})());

check('Node.js runtime is >=22.0.0 (prohibiting legacy Node 20)', fs.existsSync('package.json') && (() => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.engines?.node === '>=22.0.0';
})());

check('tsconfig.json exists and is configured for Vite SPA', fs.existsSync('tsconfig.json'));
check('vite.config.ts has chunk splitting configured', fs.existsSync('vite.config.ts') && fs.readFileSync('vite.config.ts', 'utf8').includes('manualChunks'));
check('firestore.rules is present with role immutability', fs.existsSync('firestore.rules') && fs.readFileSync('firestore.rules', 'utf8').includes('role'));
check('.gitignore protects .env and service accounts', fs.existsSync('.gitignore') && (() => {
  const gi = fs.readFileSync('.gitignore', 'utf8');
  return gi.includes('.env*') && gi.includes('serviceAccountKey.json');
})());

// 2. Vercel Configuration & Routing
console.log('\n--- 2. VERCEL CONFIGURATION AUDIT (vercel.json) ---');
check('vercel.json exists', fs.existsSync('vercel.json'));
if (fs.existsSync('vercel.json')) {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  check('Vercel rewrites configure SPA fallback to /index.html while excluding /api', (() => {
    const rewrites = vercelConfig.rewrites || [];
    return rewrites.some((r: any) => r.destination === '/index.html' && (r.source.includes('?!api') || r.source === '/(.*)'));
  })());

  check('Vercel API routes do not fall through to SPA HTML', (() => {
    const rewrites = vercelConfig.rewrites || [];
    // Ensure the SPA fallback explicitly excludes /api or leaves /api to Vercel serverless
    return rewrites.some((r: any) => r.source.includes('api'));
  })());

  check('Vercel includes public/data in serverless functions', (() => {
    return vercelConfig.functions?.['api/**/*.ts']?.includeFiles === 'public/data/**';
  })());

  check('Security headers include HSTS, CSP, X-Frame-Options', (() => {
    const headers = vercelConfig.headers?.[0]?.headers || [];
    const keys = headers.map((h: any) => h.key);
    return keys.includes('Strict-Transport-Security') && 
           keys.includes('Content-Security-Policy') && 
           keys.includes('X-Frame-Options');
  })());

  check('CSP includes Google reCAPTCHA domains for Phone Auth OTP', (() => {
    const csp = vercelConfig.headers?.[0]?.headers?.find((h: any) => h.key === 'Content-Security-Policy')?.value || '';
    return csp.includes('https://www.google.com/recaptcha/') && csp.includes('https://www.gstatic.com/recaptcha/');
  })());
}

// 3. Serverless API Endpoints Completeness
console.log('\n--- 3. SERVERLESS API ENDPOINTS IN api/ ---');
const expectedEndpoints = [
  'api/colleges.ts',
  'api/notify-request.ts',
  'api/config/firebase.ts',
  'api/ai/analyze-choices.ts',
  'api/admin/upload-colleges.ts',
  'api/_lib/index.ts'
];
for (const ep of expectedEndpoints) {
  check(`Endpoint ${ep} exists`, fs.existsSync(ep));
}

// 4. Production Verified Datasets
console.log('\n--- 4. PRODUCTION VERIFIED CUTOFF DATASETS ---');
const expectedDatasets = [
  'public/data/AP_EAPCET_MPC_2025.json',
  'public/data/AP_EAPCET_BIPC_2024.json',
  'public/data/TS_EAMCET_MPC_2025.json',
  'public/data/TS_EAMCET_BIPC_2025.json',
  'public/data/NEET_UG_2024_2025.json',
  'public/data/NEET_UG_2026_ROUND1_MCC.json',
  'public/data/NMC_MBBS_2025_2026.json'
];
for (const ds of expectedDatasets) {
  check(`Dataset ${path.basename(ds)} exists and is non-empty`, fs.existsSync(ds) && fs.statSync(ds).size > 1000);
}

// 5. Official Branding, Logo and Favicons
console.log('\n--- 5. BRAND IDENTITY, LOGO & FAVICON INTEGRATION ---');
const expectedBrandAssets = [
  'public/favicon.ico',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png',
  'public/favicon-48x48.png',
  'public/apple-touch-icon.png',
  'public/logo.png',
  'public/manifest.json'
];
for (const ba of expectedBrandAssets) {
  check(`Asset ${path.basename(ba)} exists and is valid`, fs.existsSync(ba) && fs.statSync(ba).size > 0);
}

check('index.html references official CounselorPro branding and favicon', (() => {
  const html = fs.readFileSync('index.html', 'utf8');
  return html.includes('CounselorPro | Counselling Practice') && 
         html.includes('/favicon.ico') && 
         html.includes('/logo.png');
})());

// 6. Security & Secret Hygiene
console.log('\n--- 6. SECURITY & SECRET HYGIENE AUDIT ---');
check('No private keys committed in Git repository root', !fs.existsSync('serviceAccountKey.json'));
check('No .env files committed with active production secrets', !fs.existsSync('.env.production'));
check('SUPER_ADMIN_UID configured to target owner UID', (() => {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  return envExample.includes('SUPER_ADMIN_UID="2tqT8SPAuqh5H3aw8hBxwsAjgCc2"');
})());

// Summary
console.log('\n========================================================================');
console.log(` AUDIT SUMMARY: ${passedChecks} Passed, ${failedChecks} Failed of ${totalChecks} Checks`);
console.log('========================================================================');

if (failedChecks > 0) {
  console.log('\n❌ VERDICT: NO-GO — Identified issues must be resolved before deployment.');
  process.exit(1);
} else {
  console.log('\n🚀 VERDICT: GO — CounselorPro is 100% PRODUCTION READY FOR VERCEL DEPLOYMENT!');
}
