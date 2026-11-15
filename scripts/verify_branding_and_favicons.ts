import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve('public');
const INDEX_HTML = path.resolve('index.html');

console.log('================================================================');
console.log(' COUNSELORPRO — OFFICIAL BRAND LOGO & FAVICON VERIFICATION     ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

// 1. Favicon and Brand Asset File Checks
console.log('--- 1. Favicon & Asset Files in public/ ---');
const expectedAssets = [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon-64x64.png',
  'favicon-128x128.png',
  'favicon-256x256.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'logo.png',
  'manifest.json'
];

for (const asset of expectedAssets) {
  const fullPath = path.join(PUBLIC_DIR, asset);
  const exists = fs.existsSync(fullPath);
  const size = exists ? fs.statSync(fullPath).size : 0;
  assert(exists && size > 0, `${asset} exists and has non-zero size (${size} bytes)`);
}

// 2. index.html Browser Metadata & Favicon Links
console.log('\n--- 2. index.html Browser Metadata & Favicon Links ---');
const htmlContent = fs.readFileSync(INDEX_HTML, 'utf-8');

assert(htmlContent.includes('<title>CounselorPro | Counselling Practice</title>'), 'HTML title is "CounselorPro | Counselling Practice"');
assert(htmlContent.includes('rel="icon" type="image/x-icon" href="/favicon.ico"'), 'Favicon .ico linked correctly');
assert(htmlContent.includes('rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"'), 'Favicon 16x16 PNG linked');
assert(htmlContent.includes('rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"'), 'Favicon 32x32 PNG linked');
assert(htmlContent.includes('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"'), 'Apple Touch Icon linked');
assert(htmlContent.includes('rel="manifest" href="/manifest.json"'), 'Web App Manifest linked');
assert(htmlContent.includes('name="theme-color" content="#059669"'), 'Brand theme-color meta tag (#059669) configured');
assert(htmlContent.includes('property="og:image" content="/logo.png"'), 'OpenGraph image points to /logo.png');

// 3. Header & Navigation Brand Logo Verification
console.log('\n--- 3. Official Logo Asset References in Components ---');

const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
assert(appContent.includes('src="/logo.png"'), 'App.tsx header renders /logo.png');

const landingContent = fs.readFileSync(path.resolve('src/components/LandingPage.tsx'), 'utf-8');
assert(landingContent.includes('src="/logo.png"'), 'LandingPage.tsx header & footer render /logo.png');

const adminContent = fs.readFileSync(path.resolve('src/components/admin/AdminDashboard.tsx'), 'utf-8');
assert(adminContent.includes('src="/logo.png"'), 'AdminDashboard.tsx renders /logo.png');

const authContent = fs.readFileSync(path.resolve('src/components/auth/AuthModal.tsx'), 'utf-8');
assert(authContent.includes('src="/logo.png"'), 'AuthModal.tsx renders /logo.png');

console.log('\n----------------------------------------------------------------');
console.log(`Branding & Favicon Verification: ${passCount} Passed, ${failCount} Failed`);
console.log('----------------------------------------------------------------');

if (failCount > 0) {
  process.exit(1);
}
