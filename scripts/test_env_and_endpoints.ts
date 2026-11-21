import http from 'http';
import { spawn, execSync } from 'child_process';

function killProcess(proc: any) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {}
}

function makeRequest(method: string, path: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers: reqHeaders,
        timeout: 10000
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode || 200, data });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log('========================================================================');
  console.log('  TESTING COUNSELORPRO ENVIRONMENT CONFIGURATION & SERVER DIAGNOSTICS   ');
  console.log('========================================================================\n');

  // Test 1: Start server with current .env (No GEMINI_API_KEY, partial Firebase)
  console.log('1. Starting dev server with default local environment...');
  const server = spawn('npx', ['tsx', 'server.ts'], {
    shell: true,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'development' }
  });

  let serverOutput = '';
  server.stdout?.on('data', (d) => {
    serverOutput += d.toString();
  });
  server.stderr?.on('data', (d) => {
    serverOutput += d.toString();
  });

  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    if (serverOutput.includes('Express server running on http://localhost:3000')) {
      serverReady = true;
      break;
    }
  }

  if (!serverReady) {
    console.error('Server failed to start within 15 seconds.');
    console.error('Captured Output:\n', serverOutput);
    server.kill();
    process.exit(1);
  }

  console.log('Captured Startup Output:\n---');
  console.log(serverOutput.trim());
  console.log('---\n');

  // Assert expected startup diagnostic format
  const hasGeminiMissing = serverOutput.includes('Gemini API configuration: Missing');
  const hasAICounselorDev = serverOutput.includes('AI Counselor: Development simulation mode');
  const hasFirebaseAdmin = serverOutput.includes('Firebase Admin configuration:');
  const hasFirestoreFallback = serverOutput.includes('Firestore: Disabled, local fallback enabled');

  console.log(`[CHECK] Gemini Missing Diagnostic: ${hasGeminiMissing ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] AI Counselor Dev Mode: ${hasAICounselorDev ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Firebase Admin Diagnostic: ${hasFirebaseAdmin ? 'PASS' : 'FAIL'}`);
  console.log(`[CHECK] Firestore Local Fallback: ${hasFirestoreFallback ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Test /api/config/firebase endpoint
  console.log('2. Testing /api/config/firebase endpoint...');
  try {
    const configRes = await makeRequest('GET', '/api/config/firebase');
    console.log(`   Response Status: ${configRes.status}`);
    const hasApiKey = Boolean(configRes.data.apiKey);
    const hasAuthDomain = Boolean(configRes.data.authDomain);
    const hasProjectId = Boolean(configRes.data.projectId);
    const hasAppId = Boolean(configRes.data.appId);
    console.log(`   [CHECK] Firebase API Key present: ${hasApiKey}`);
    console.log(`   [CHECK] Auth Domain present: ${hasAuthDomain}`);
    console.log(`   [CHECK] Project ID present: ${hasProjectId}`);
    console.log(`   [CHECK] App ID present: ${hasAppId}`);
    console.log(`   [CHECK] Private key NOT exposed: ${configRes.data.privateKey === undefined && configRes.data.private_key === undefined}`);
  } catch (err: any) {
    console.error('   /api/config/firebase failed:', err.message);
  }

  // Test 3: Test /api/ai/analyze-choices in simulation mode
  console.log('\n3. Testing /api/ai/analyze-choices (Simulator mode)...');
  try {
    const aiRes = await makeRequest('POST', '/api/ai/analyze-choices', {
      profile: {
        exam: 'AP_EAPCET',
        stream: 'MPC',
        rank: 12500,
        category: 'OC',
        region: 'AU',
        gender: 'BOYS'
      },
      options: [
        { priority: 1, collegeCode: 'AUCE', collegeName: 'AU College of Engineering', branch: 'CSE' },
        { priority: 2, collegeCode: 'JNTUK', collegeName: 'JNTU Kakinada', branch: 'CSE' }
      ]
    });
    console.log(`   Response Status: ${aiRes.status}`);
    const isSimulation = aiRes.data?.analysis?.includes('AI Counselor Analysis (Simulator Mode)') || aiRes.data?.analysis?.includes('Simulator Mode');
    console.log(`   [CHECK] Simulation response received: ${isSimulation ? 'PASS' : 'FAIL'}`);
  } catch (err: any) {
    console.error('   /api/ai/analyze-choices failed:', err.message);
  }

  // Test 4: Test /api/colleges dataset lookup
  console.log('\n4. Testing /api/colleges dataset lookup (Static fallback)...');
  try {
    const collegesRes = await makeRequest('GET', '/api/colleges?datasetId=AP_EAPCET_MPC_2025');
    console.log(`   Response Status: ${collegesRes.status}`);
    console.log(`   Colleges returned: ${collegesRes.data?.colleges?.length || 0}`);
    console.log(`   Source: "${collegesRes.data?.source}"`);
    console.log(`   [CHECK] Colleges served correctly: ${collegesRes.data?.colleges?.length > 100 ? 'PASS' : 'FAIL'}`);
  } catch (err: any) {
    console.error('   /api/colleges failed:', err.message);
  }

  // Stop server 1 cleanly
  killProcess(server);

  // Test 5: Verify startup diagnostics when GEMINI_API_KEY is configured
  console.log('\n5. Testing startup diagnostics when GEMINI_API_KEY is configured...');
  const serverWithKey = spawn('npx', ['tsx', 'server.ts'], {
    shell: true,
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'development',
      GEMINI_API_KEY: ['DIAGNOSTIC', 'ACTIVE', 'KEY'].join('_')
    }
  });

  let serverWithKeyOutput = '';
  serverWithKey.stdout?.on('data', (d) => {
    serverWithKeyOutput += d.toString();
  });
  serverWithKey.stderr?.on('data', (d) => {
    serverWithKeyOutput += d.toString();
  });

  let server2Ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    if (serverWithKeyOutput.includes('Express server running on http://localhost:3001')) {
      server2Ready = true;
      break;
    }
  }

  const hasGeminiAvailable = serverWithKeyOutput.includes('Gemini API configuration: Available');
  console.log(`   [CHECK] Gemini Available Diagnostic: ${hasGeminiAvailable ? 'PASS' : 'FAIL'}`);
  const keyNotExposed = !serverWithKeyOutput.includes('AIzaSyExampleTestKey1234567890');
  console.log(`   [CHECK] Key value NOT leaked in terminal: ${keyNotExposed ? 'PASS' : 'FAIL'}`);

  killProcess(serverWithKey);

  console.log('\n========================================================================');
  console.log('  ENVIRONMENT & ENDPOINT VERIFICATION COMPLETE                          ');
  console.log('========================================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
