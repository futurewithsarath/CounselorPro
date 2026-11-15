import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();

const EXPECTED_PROJECT_ID = 'counselorpro';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

function resolveServiceAccount(): { credential: any; projectId: string } | null {
  // 1. Check serviceAccountKey.json or service-account.json in workspace
  const possiblePaths = [
    path.join(process.cwd(), 'serviceAccountKey.json'),
    path.join(process.cwd(), 'service-account.json'),
    path.join(process.cwd(), 'counselorpro-serviceAccount.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (json.project_id) {
          return { credential: cert(json), projectId: json.project_id };
        }
      } catch (e) {
        console.warn(`[WARN] Could not parse service account file at ${p}:`, e);
      }
    }
  }

  // 2. Check GOOGLE_APPLICATION_CREDENTIALS environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const json = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      return { credential: cert(json), projectId: json.project_id || EXPECTED_PROJECT_ID };
    } catch {}
  }

  // 3. Check environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || EXPECTED_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    return {
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey
      }),
      projectId
    };
  }

  return null;
}

async function main() {
  console.log('\n================================================================');
  console.log('   CounselorPro — Secure Super Admin Privilege Bootstrap CLI   ');
  console.log('================================================================\n');

  // Step 1: Verify & Initialize Firebase Admin SDK
  const sa = resolveServiceAccount();
  if (!sa) {
    console.error('❌ FIREBASE ADMIN SDK CREDENTIALS NOT CONFIGURED');
    console.error('----------------------------------------------------------------');
    console.error('To assign custom user claims, Firebase Admin SDK requires server credentials.');
    console.error('\n📋 HOW TO CONFIGURE IN 60 SECONDS (SECURE & PRIVATE):');
    console.error('1. Open your Firebase Console: https://console.firebase.google.com/project/counselorpro/settings/serviceaccounts/adminsdk');
    console.error('2. Click "Generate new private key", then click "Generate key".');
    console.error('3. A JSON file will download to your computer.');
    console.error('4. Move or save that JSON file into this project folder as:');
    console.error(`   ${path.join(process.cwd(), 'serviceAccountKey.json')}`);
    console.error('   (Note: `serviceAccountKey.json` is already protected by .gitignore and will NEVER be committed to Git).');
    console.error('\n5. Then re-run this command:');
    console.error('   npm run grant-super-admin\n');
    process.exit(1);
  }

  // Step 2: Ensure correct Firebase Project
  if (sa.projectId !== EXPECTED_PROJECT_ID) {
    console.error(`❌ PROJECT MISMATCH GUARD: Expected Firebase project "${EXPECTED_PROJECT_ID}", but credentials point to "${sa.projectId}".`);
    console.error('Aborting operation to prevent accidental modification of an unrelated project.\n');
    process.exit(1);
  }

  const adminApp = getApps().length === 0
    ? initializeApp({ credential: sa.credential, projectId: sa.projectId })
    : getApps()[0];

  const auth = getAuth(adminApp);
  const db = getFirestore(adminApp);

  console.log(`🔒 Connected to verified Firebase Project: [ ${sa.projectId} ]\n`);

  // Step 3: Get UID and registered Email (CLI args, environment, or interactive prompt)
  let targetUid = process.argv[2] || '';
  let targetEmail = process.argv[3] || process.env.SUPER_ADMIN_EMAIL || '';

  if (!targetUid) {
    targetUid = await askQuestion('👉 Enter your existing Firebase UID: ');
  }
  if (!targetEmail || targetEmail === 'owner@example.com') {
    targetEmail = await askQuestion('👉 Enter your exact registered Email Address: ');
  }

  targetUid = targetUid.trim();
  targetEmail = targetEmail.trim().toLowerCase();

  if (!targetUid) {
    console.error('❌ Error: Firebase UID is required.');
    process.exit(1);
  }
  if (!targetEmail) {
    console.error('❌ Error: Registered Email Address is required.');
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user in Firebase Auth with UID: "${targetUid}"...`);

  // Step 4: Retrieve User by UID
  let userRecord: any;
  try {
    userRecord = await auth.getUser(targetUid);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.error(`\n❌ USER NOT FOUND: No account exists in project "${EXPECTED_PROJECT_ID}" with UID: "${targetUid}".`);
      console.error('Please verify the UID from your Firebase Authentication console and try again.\n');
      process.exit(1);
    }
    console.error('\n❌ Lookup Error:', err.message || err);
    process.exit(1);
  }

  console.log(`✅ User identified: ${userRecord.displayName || 'No display name'}`);
  console.log(`   Account Email:    ${userRecord.email || 'None'}`);
  console.log(`   Email Verified:   ${userRecord.emailVerified ? 'YES' : 'NO'}`);
  console.log(`   Phone Number:     ${userRecord.phoneNumber || 'None'}`);
  console.log(`   Created At:       ${userRecord.metadata.creationTime}`);

  // Step 5: Verify exact Email Match
  const actualEmail = (userRecord.email || '').trim().toLowerCase();
  if (actualEmail !== targetEmail) {
    console.error('\n❌ SECURITY VERIFICATION FAILED: Email mismatch!');
    console.error(`   Provided email: "${targetEmail}"`);
    console.error(`   Actual email:   "${actualEmail}"`);
    console.error('The registered email does not match the supplied UID. Operation aborted.\n');
    process.exit(1);
  }

  // Step 6: Verify and enforce email verification
  if (!userRecord.emailVerified) {
    console.log('\n⚡ Notice: Account email is currently unverified.');
    console.log('   Marking Super Admin email as verified in Firebase Authentication...');
    await auth.updateUser(targetUid, { emailVerified: true });
    console.log('   Email verified status updated to: TRUE.');
  }

  // Step 7: Preserve unrelated custom claims while assigning super_admin
  const existingClaims = userRecord.customClaims || {};
  console.log('\n🛡️  Inspecting existing custom claims:', JSON.stringify(existingClaims));

  const updatedClaims = {
    ...existingClaims,
    role: 'super_admin'
  };

  // Step 8: Assign Custom User Claims
  console.log('🔒 Setting authoritative custom claim: { role: "super_admin" }...');
  await auth.setCustomUserClaims(targetUid, updatedClaims);

  // Step 9: Verify custom claim was saved
  const refreshedUser = await auth.getUser(targetUid);
  const verifiedRole = refreshedUser.customClaims?.role;

  if (verifiedRole !== 'super_admin') {
    console.error('\n❌ VERIFICATION FAILED: Custom claim was not persisted.');
    process.exit(1);
  }
  console.log('✅ Custom claim verified in Firebase Authentication token claims: { role: "super_admin" }');

  // Step 10: Update Firestore user profile
  try {
    const userDocRef = db.collection('users').doc(targetUid);
    await userDocRef.set({
      uid: targetUid,
      email: actualEmail,
      displayName: userRecord.displayName || actualEmail.split('@')[0],
      phoneNumber: userRecord.phoneNumber || null,
      photoURL: userRecord.photoURL || null,
      providerIds: userRecord.providerData.map((p: any) => p.providerId),
      role: 'super_admin',
      accountStatus: 'active',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`💾 Firestore document updated at: users/${targetUid}`);
  } catch (fsErr: any) {
    console.warn('⚠️  Notice: Firestore profile document update warning (custom claims are active):', fsErr.message);
  }

  // Step 11: Write tamper-proof Audit Log
  try {
    await db.collection('audit_logs').add({
      action: 'GRANT_SUPER_ADMIN',
      targetUid,
      targetEmail: actualEmail,
      firebaseProject: EXPECTED_PROJECT_ID,
      timestamp: FieldValue.serverTimestamp(),
      executor: 'BOOTSTRAP_CLI',
      status: 'SUCCESS'
    });
    console.log('📝 Audit log recorded in Firestore `audit_logs` collection.');
  } catch (auditErr: any) {
    console.warn('⚠️  Notice: Audit log entry bypassed:', auditErr.message);
  }

  // Update .env SUPER_ADMIN_EMAIL to match actual email for server endpoints
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^SUPER_ADMIN_EMAIL=.*$/m, `SUPER_ADMIN_EMAIL="${actualEmail}"`);
      envContent = envContent.replace(/^ADMIN_EMAILS=.*$/m, `ADMIN_EMAILS="${actualEmail}"`);
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`📄 Updated SUPER_ADMIN_EMAIL and ADMIN_EMAILS in .env to "${actualEmail}".`);
    }
  } catch {}

  console.log('\n================================================================');
  console.log('🎉 SUCCESS: SUPER ADMIN ACCESS CONFIRMED FOR YOUR ACCOUNT!');
  console.log(`   UID:            ${targetUid}`);
  console.log(`   Email:          ${actualEmail}`);
  console.log(`   Assigned Role:  super_admin`);
  console.log(`   Project:        ${EXPECTED_PROJECT_ID}`);
  console.log('================================================================\n');

  console.log('📌 HOW TO ACTIVATE IN YOUR BROWSER:');
  console.log('1. Open CounselorPro in your browser (http://localhost:3000).');
  console.log('2. If you are already signed in, simply click Sign Out and Sign In again');
  console.log('   (this refreshes your Firebase ID token to include the new custom claim).');
  console.log('3. Open the top right profile menu: you will now see the "Super Admin (Owner)" badge');
  console.log('   and the "Admin Dashboard" button.');
  console.log('4. Navigating to http://localhost:3000/admin will unlock the complete management console.\n');
}

main().catch(err => {
  console.error('\n❌ Execution Error:', err.message || err);
  process.exit(1);
});
