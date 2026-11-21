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

function makePostRequest(path: string, payload: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData).toString()
        },
        timeout: 25000
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 200, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function testRealGemini() {
  console.log('========================================================================');
  console.log('  TESTING REAL GEMINI API INTEGRATION ON COUNSELORPRO DEV SERVER       ');
  console.log('========================================================================\n');

  console.log('1. Starting dev server with live .env (including GEMINI_API_KEY)...');
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
    killProcess(server);
    process.exit(1);
  }

  console.log('Server Startup Diagnostics:\n---');
  console.log(serverOutput.trim());
  console.log('---\n');

  const hasGeminiAvailable = serverOutput.includes('Gemini API configuration: Available');
  console.log(`[CHECK] Gemini API Available: ${hasGeminiAvailable ? 'PASS' : 'FAIL'}`);

  console.log('\n2. Sending test payload to /api/ai/analyze-choices for real AI evaluation...');
  try {
    const res = await makePostRequest('/api/ai/analyze-choices', {
      profile: {
        exam: 'AP_EAPCET',
        stream: 'MPC',
        rank: 9850,
        category: 'OC',
        region: 'AU',
        gender: 'BOYS'
      },
      options: [
        { priority: 1, collegeCode: 'AUCE', collegeName: 'AU College of Engineering', branch: 'CSE' },
        { priority: 2, collegeCode: 'JNTUK', collegeName: 'JNTU College of Engineering Kakinada', branch: 'ECE' },
        { priority: 3, collegeCode: 'GMRIT', collegeName: 'GMR Institute of Technology', branch: 'CSE' }
      ]
    });

    console.log(`   Response Status: ${res.status}`);
    const analysis = res.data?.analysis || '';
    const isMock = analysis.includes('Simulator Mode') || analysis.includes('simulation fallback');
    const isSuccess = res.status === 200 && analysis.length > 50 && !isMock;

    console.log(`   [CHECK] Real Gemini API Response Generated: ${isSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`   [CHECK] Is Live Model (not simulation fallback): ${!isMock ? 'PASS' : 'FAIL'}`);
    console.log(`   Analysis Length: ${analysis.length} characters`);
    console.log(`   Analysis text:\n   ${analysis}\n`);

    if (!isSuccess && res.data?.error) {
      console.error(`   Error details: ${res.data.error}`);
    }
  } catch (err: any) {
    console.error('   API call failed:', err.message);
  }

  killProcess(server);
  console.log('========================================================================');
  console.log('  REAL GEMINI VERIFICATION COMPLETE                                     ');
  console.log('========================================================================\n');
}

testRealGemini().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
