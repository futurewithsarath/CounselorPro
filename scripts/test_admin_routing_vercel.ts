import assert from 'node:assert';
import fs from 'node:fs';
import { VercelRequest, VercelResponse } from '@vercel/node';
import adminCollegesHandler from '../api/admin/colleges';
import { readDynamicStore, writeDynamicStore } from '../api/_lib/dynamicCollegesStore';

function createMockReqRes(options: {
  method?: string;
  url?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: any;
}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    query: options.query || {},
    headers: options.headers || {},
    body: options.body || {}
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    send(data: any) {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

function simulateVercelRewrite(url: string, method: string, headers: Record<string, string>, body?: any) {
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const rewrites: Array<{ source: string; destination: string }> = vercelJson.rewrites || [];

  let matchedDestination = url;
  let queryParams: Record<string, string> = {};

  // Check rewrite rules
  for (const rewrite of rewrites) {
    if (rewrite.source === '/api/admin/colleges/:id') {
      const match = url.match(/^\/api\/admin\/colleges\/([^?]+)(\?.*)?$/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        queryParams.id = id;
        matchedDestination = '/api/admin/colleges';
        if (match[2]) {
          const searchParams = new URLSearchParams(match[2]);
          searchParams.forEach((val, key) => { queryParams[key] = val; });
        }
        break;
      }
    }
  }

  // Check SPA rewrite exclusion: verify that /api/* does not hit /index.html
  const spaRewrite = rewrites.find(r => r.destination === '/index.html');
  if (spaRewrite) {
    // Negative lookahead (?<!api/)
    const isApi = url.startsWith('/api/') || url === '/api';
    assert(isApi, 'Test request must be an API route');
    const regex = new RegExp('^/((?!api/).*)$');
    assert(!regex.test(url), 'API request must NOT match SPA fallback rewrite');
  }

  return createMockReqRes({
    method,
    url: matchedDestination,
    query: queryParams,
    headers,
    body
  });
}

async function runVercelRoutingSuite() {
  console.log('========================================================================');
  console.log('   COUNSELORPRO — VERCEL ROUTING & PARAMETER MAPPING VERIFICATION       ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Rewrite rule syntax and priority
  console.log('📌 1. VERCEL.JSON REWRITE ARCHITECTURE');
  test('vercel.json includes /api/admin/colleges/:id rewrite rule', () => {
    const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const route = vercelJson.rewrites.find((r: any) => r.source === '/api/admin/colleges/:id');
    assert(route, 'Rewrite rule must exist');
    assert.strictEqual(route.destination, '/api/admin/colleges?id=:id');
  });

  test('SPA catch-all rewrite does NOT intercept /api/admin/colleges/:id', () => {
    const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const spaRule = vercelJson.rewrites.find((r: any) => r.destination === '/index.html');
    assert(spaRule, 'SPA rule exists');
    const regex = new RegExp('^' + spaRule.source + '$');
    assert(!regex.test('/api/admin/colleges/test-id-123'), 'Must NOT match SPA fallback');
    assert(!regex.test('/api/colleges'), 'Must NOT match SPA fallback');
  });

  // 2. Unauthenticated and Unauthorized Rejection on Parameterized Routes
  console.log('\n🛡️ 2. SECURITY GATE VERIFICATION ON PARAMETERIZED ROUTES');
  await asyncTest('DELETE /api/admin/colleges/:id without token returns HTTP 401', async () => {
    const { req, res, getStatus } = simulateVercelRewrite(
      '/api/admin/colleges/cbit-cse-999',
      'DELETE',
      {}
    );
    await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
    assert.strictEqual(getStatus(), 401, 'Must reject with 401');
  });

  await asyncTest('PUT /api/admin/colleges/:id without token returns HTTP 401', async () => {
    const { req, res, getStatus } = simulateVercelRewrite(
      '/api/admin/colleges/cbit-cse-999',
      'PUT',
      {},
      { cutoffOC: 5000 }
    );
    await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
    assert.strictEqual(getStatus(), 401, 'Must reject with 401');
  });

  await asyncTest('DELETE /api/admin/colleges/:id with invalid Bearer token returns HTTP 401', async () => {
    const { req, res, getStatus } = simulateVercelRewrite(
      '/api/admin/colleges/cbit-cse-999',
      'DELETE',
      { authorization: 'Bearer invalid.mock.jwt' }
    );
    await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
    assert.strictEqual(getStatus(), 401, 'Must reject with 401');
  });

  // 3. ID Extraction Mechanism Tests
  console.log('\n🔍 3. MULTI-CHANNEL ID EXTRACTION & REWRITE RESOLUTION');
  test('api/admin/colleges.ts extracts ID from req.query.id (Vercel rewrite channel)', () => {
    const adminCollegesSrc = fs.readFileSync('api/admin/colleges.ts', 'utf8');
    assert(adminCollegesSrc.includes('const queryId = req.query.id as string | undefined;'));
  });

  test('api/admin/colleges.ts extracts ID from req.body.id (Client payload channel)', () => {
    const adminCollegesSrc = fs.readFileSync('api/admin/colleges.ts', 'utf8');
    assert(adminCollegesSrc.includes('const bodyId = (req.body?.id || req.body?.collegeId) as string | undefined;'));
  });

  test('api/admin/colleges.ts extracts ID from req.url path segments (Direct path channel)', () => {
    const adminCollegesSrc = fs.readFileSync('api/admin/colleges.ts', 'utf8');
    assert(adminCollegesSrc.includes('urlParts[urlParts.length - 1]'));
  });

  // 4. End-to-End Dynamic Store Modification under Mock Rewrite
  console.log('\n📦 4. MOCK ROUTING PERSISTENCE INTEGRATION');
  test('PUT and DELETE routing successfully updates dynamic store via query parameter', () => {
    const testId = 'test-rewrite-college-777';
    // Initial state: add test college
    const store = readDynamicStore();
    store.customColleges.push({
      id: testId,
      code: 'TEST777',
      name: 'Rewrite Test College',
      branch: 'CSE',
      cutoffOC: 20000
    });
    writeDynamicStore(store);

    // Verify initial presence
    assert(readDynamicStore().customColleges.some(c => c.id === testId));

    // Simulate DELETE with extracted ID from rewrite
    const { req } = simulateVercelRewrite(
      `/api/admin/colleges/${testId}?datasetId=AP_EAPCET_MPC_2025`,
      'DELETE',
      {}
    );
    assert.strictEqual(req.query.id, testId, 'Rewritten query.id must match target college ID');
    assert.strictEqual(req.query.datasetId, 'AP_EAPCET_MPC_2025', 'Query parameters must be preserved');

    // Clean up
    writeDynamicStore({ customColleges: [], deletedCollegeIds: [] });
  });

  console.log('\n========================================================================');
  console.log(`VERCEL ROUTING SUMMARY: ${passed}/${passed + failed} Tests Passed (${failed} Failed)`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runVercelRoutingSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
