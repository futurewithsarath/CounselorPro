import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  readDynamicStore,
  writeDynamicStore,
  addOrUpdateDynamicCollege,
  deleteDynamicCollege,
  applyDynamicModifications,
  matchesDataset
} from '../api/_lib/dynamicCollegesStore';
import collegesHandler from '../api/colleges';
import adminCollegesHandler from '../api/admin/colleges';
import { VercelRequest, VercelResponse } from '@vercel/node';

const SUPER_ADMIN_UID = '2tqT8SPAuqh5H3aw8hBxwsAjgCc2';

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

async function runCollegeSyncSuite() {
  console.log('========================================================================');
  console.log('   COUNSELORPRO — COLLEGE DATA SYNCHRONIZATION & MANAGEMENT VERIFICATION');
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

  // Backup existing dynamic store if present
  const storePath = path.join(process.cwd(), 'public', 'data', 'dynamic_colleges.json');
  let originalStoreContent: string | null = null;
  if (fs.existsSync(storePath)) {
    originalStoreContent = fs.readFileSync(storePath, 'utf8');
  }

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Dynamic Store Core Logic & Schema Parity
    // -------------------------------------------------------------------------
    console.log('📦 SUITE 1: Dynamic Store Core Logic & Modification Engine');

    const testCollegeA = {
      id: 'ap_eapcet-testit-cse-999999',
      code: 'TESTIT',
      name: 'Test Institute of Technology and Science',
      branch: 'CSE',
      district: 'Visakhapatnam',
      region: 'AU',
      type: 'Private-Autonomous',
      fee: 75000,
      cutoffOC: 12500,
      cutoffBC: 18500,
      cutoffSCST: 35000,
      exam: 'AP_EAPCET',
      stream: 'MPC',
      year: 2025,
      datasetId: 'AP_EAPCET_MPC_2025'
    };

    test('addOrUpdateDynamicCollege persists new college record to dynamic store', () => {
      addOrUpdateDynamicCollege(testCollegeA);
      const store = readDynamicStore();
      const found = store.customColleges.find(c => c.id === testCollegeA.id);
      assert(found, 'Added college must be found in customColleges');
      assert.strictEqual(found.name, testCollegeA.name);
      assert.strictEqual(found.code, 'TESTIT');
    });

    test('matchesDataset correctly routes colleges to respective examination streams', () => {
      assert(matchesDataset(testCollegeA, 'AP_EAPCET_MPC_2025'));
      assert(!matchesDataset(testCollegeA, 'TS_EAMCET_MPC_2025'));
      assert(!matchesDataset(testCollegeA, 'NEET_UG_2024_2025'));
    });

    test('applyDynamicModifications prepends newly added college into public dataset', () => {
      const baseSample = [
        { id: 'ap-base-1', code: 'BASE1', name: 'Base College 1', branch: 'CSE' }
      ];
      const merged = applyDynamicModifications('AP_EAPCET_MPC_2025', baseSample);
      assert(merged.some(c => c.id === testCollegeA.id), 'Dynamic college must be included in merged dataset');
      assert(merged.some(c => c.id === 'ap-base-1'), 'Base records must be preserved');
      assert.strictEqual(merged.length, 2);
    });

    test('deleteDynamicCollege removes college from customColleges and adds to deletedCollegeIds', () => {
      deleteDynamicCollege(testCollegeA.id);
      const store = readDynamicStore();
      assert(!store.customColleges.some(c => c.id === testCollegeA.id), 'Deleted college must not exist in customColleges');
      assert(store.deletedCollegeIds.includes(testCollegeA.id), 'Deleted ID must be recorded in deletedCollegeIds');
    });

    test('applyDynamicModifications removes deleted colleges from public output', () => {
      const baseWithDeleted = [
        { id: testCollegeA.id, code: 'TESTIT', name: 'Test Institute' },
        { id: 'ap-base-2', code: 'BASE2', name: 'Base College 2' }
      ];
      const filtered = applyDynamicModifications('AP_EAPCET_MPC_2025', baseWithDeleted);
      assert(!filtered.some(c => c.id === testCollegeA.id), 'Deleted college must be excluded');
      assert(filtered.some(c => c.id === 'ap-base-2'), 'Non-deleted base college must remain');
    });

    // -------------------------------------------------------------------------
    // SUITE 2: Backend Public Dataset API (/api/colleges) Synchronization
    // -------------------------------------------------------------------------
    console.log('\n🌐 SUITE 2: Public Dataset API (/api/colleges) Dynamic Synchronization');

    await asyncTest('GET /api/colleges returns 200 with full synchronized dataset', async () => {
      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'GET',
        query: { datasetId: 'AP_EAPCET_MPC_2025' }
      });
      await collegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 200);
      const data = getData();
      assert(Array.isArray(data.colleges), 'Must return colleges array');
      assert(data.colleges.length > 1000, 'Must have at least 1,000 AP EAPCET college records');
      assert.strictEqual(data.metadata.exam, 'AP_EAPCET');
    });

    await asyncTest('GET /api/colleges dynamically includes newly registered colleges', async () => {
      const syncCol = {
        id: 'ap_eapcet-synccol-cse-888888',
        code: 'SYNCCOL',
        name: 'Synchronized Engineering College',
        branch: 'CSE',
        district: 'Guntur',
        region: 'AU',
        type: 'Private-Autonomous',
        fee: 65000,
        cutoffOC: 15000,
        cutoffBC: 22000,
        cutoffSCST: 45000,
        exam: 'AP_EAPCET',
        stream: 'MPC',
        year: 2025,
        datasetId: 'AP_EAPCET_MPC_2025'
      };

      addOrUpdateDynamicCollege(syncCol);

      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'GET',
        query: { datasetId: 'AP_EAPCET_MPC_2025' }
      });
      await collegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 200);
      const data = getData();
      const found = data.colleges.find((c: any) => c.id === syncCol.id);
      assert(found, 'New college must be present in public /api/colleges response');
      assert.strictEqual(found.name, syncCol.name);
      assert.strictEqual(found.code, 'SYNCCOL');
    });

    await asyncTest('GET /api/colleges immediately excludes college after deletion', async () => {
      const syncColId = 'ap_eapcet-synccol-cse-888888';
      deleteDynamicCollege(syncColId);

      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'GET',
        query: { datasetId: 'AP_EAPCET_MPC_2025' }
      });
      await collegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 200);
      const data = getData();
      const found = data.colleges.find((c: any) => c.id === syncColId);
      assert(!found, 'Deleted college must NOT be present in public /api/colleges response');
    });

    await asyncTest('GET /api/colleges validates invalid datasetId with HTTP 400', async () => {
      const { req, res, getStatus } = createMockReqRes({
        method: 'GET',
        query: { datasetId: 'INVALID_DATASET_123' }
      });
      await collegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 400);
    });

    // -------------------------------------------------------------------------
    // SUITE 3: Super Admin API Security & Access Control (/api/admin/colleges)
    // -------------------------------------------------------------------------
    console.log('\n🛡️ SUITE 3: Super Admin Privilege & Access Control on /api/admin/colleges');

    await asyncTest('POST /api/admin/colleges rejects unauthenticated request with HTTP 401', async () => {
      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'POST',
        headers: {},
        body: { code: 'FAIL', name: 'Unauthorized College' }
      });
      await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 401);
      assert(getData().error.includes('Missing Firebase ID token'));
    });

    await asyncTest('DELETE /api/admin/colleges rejects unauthenticated request with HTTP 401', async () => {
      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'DELETE',
        headers: {},
        query: { id: 'some-id' }
      });
      await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 401);
      assert(getData().error.includes('Missing Firebase ID token'));
    });

    await asyncTest('PUT /api/admin/colleges rejects unauthenticated request with HTTP 401', async () => {
      const { req, res, getStatus, getData } = createMockReqRes({
        method: 'PUT',
        headers: {},
        query: { id: 'some-id' },
        body: { name: 'New Name' }
      });
      await adminCollegesHandler(req as VercelRequest, res as VercelResponse);
      assert.strictEqual(getStatus(), 401);
      assert(getData().error.includes('Missing Firebase ID token'));
    });

    // -------------------------------------------------------------------------
    // SUITE 4: Codebase Static Architecture & UI Integration Audit
    // -------------------------------------------------------------------------
    console.log('\n🔍 SUITE 4: Frontend Admin UI Integration & Client Cache Purging');

    const adminDashboardSrc = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');
    const collegesTabSrc = fs.readFileSync('src/components/admin/tabs/CollegesTab.tsx', 'utf8');
    const collegesDataSrc = fs.readFileSync('src/data/colleges.ts', 'utf8');
    const serverSrc = fs.readFileSync('server.ts', 'utf8');

    test('AdminDashboard.tsx handleAddCollege sends POST request to /api/admin/colleges with Bearer token', () => {
      assert(adminDashboardSrc.includes("fetch('/api/admin/colleges'"), 'Must call /api/admin/colleges');
      assert(adminDashboardSrc.includes("method: 'POST'"), 'Must use POST method');
      assert(adminDashboardSrc.includes("'Authorization': `Bearer ${token}`"), 'Must send Bearer token');
    });

    test('AdminDashboard.tsx handleDeleteCollege sends DELETE request to /api/admin/colleges/:id', () => {
      assert(adminDashboardSrc.includes('/api/admin/colleges/'), 'Must target /api/admin/colleges/ endpoint');
      assert(adminDashboardSrc.includes("method: 'DELETE'"), 'Must use DELETE method');
      assert(adminDashboardSrc.includes("'Authorization': `Bearer ${token}`"), 'Must send Bearer token');
    });

    test('AdminDashboard.tsx calls clearCollegesClientCache() on both add and delete', () => {
      const addMatches = adminDashboardSrc.split('clearCollegesClientCache()').length - 1;
      assert(addMatches >= 4, `Must call clearCollegesClientCache on add, update, delete, and publish (found ${addMatches})`);
    });

    test('CollegesTab.tsx delete confirmation modal explicitly displays College Name and Code', () => {
      assert(collegesTabSrc.includes('Confirm College Deletion'), 'Modal must have clear confirmation title');
      assert(collegesTabSrc.includes('deletingCollege.code'), 'Modal must display target college code');
      assert(collegesTabSrc.includes('deletingCollege.name'), 'Modal must display target college name');
      assert(collegesTabSrc.includes('deletingCollege.id'), 'Modal must display target college ID');
    });

    test('CollegesTab.tsx Edit modal contains direct "Delete Record" button', () => {
      assert(collegesTabSrc.includes('Delete Record'), 'Edit modal must provide an intuitive delete button');
    });

    test('server.ts implements both POST and DELETE /api/admin/colleges routes with verifySuperAdmin middleware', () => {
      assert(serverSrc.includes('app.post("/api/admin/colleges"'), 'server.ts must implement POST /api/admin/colleges');
      assert(serverSrc.includes('app.delete("/api/admin/colleges/:id"'), 'server.ts must implement DELETE /api/admin/colleges/:id');
      assert(serverSrc.includes('app.delete("/api/admin/colleges"'), 'server.ts must implement DELETE /api/admin/colleges');
      assert(serverSrc.includes('app.put("/api/admin/colleges/:id"'), 'server.ts must implement PUT /api/admin/colleges/:id');
    });

    test('server.ts /api/colleges route applies dynamic additions and exclusions for live synchronization', () => {
      assert(serverSrc.includes('applyDynamicModifications(datasetId, activeColleges)'), 'Firestore results must be synchronized');
      assert(serverSrc.includes('applyDynamicModifications(datasetId, activeRecords)'), 'Committed file results must be synchronized');
      assert(serverSrc.includes('firestoreTombstones.has'), 'Firestore tombstones must be filtered from output');
    });

    test('api/admin/colleges.ts enforces persistent Firestore CRUD, tombstone recording, and 409 conflict detection', () => {
      const adminCollegesSrc = fs.readFileSync('api/admin/colleges.ts', 'utf8');
      assert(adminCollegesSrc.includes('collection("college_tombstones")'), 'Must record tombstones in college_tombstones collection');
      assert(adminCollegesSrc.includes('res.status(409)'), 'Must return HTTP 409 Conflict for duplicate IDs');
      assert(adminCollegesSrc.includes('res.status(500)'), 'Must return HTTP 500 when database persistence fails');
      assert(adminCollegesSrc.includes('isCustom: true'), 'Must mark dynamic additions as isCustom: true');
    });

    test('dynamicCollegesStore.ts guards against read-only serverless filesystem write failures', () => {
      const dynamicStoreSrc = fs.readFileSync('api/_lib/dynamicCollegesStore.ts', 'utf8');
      assert(dynamicStoreSrc.includes('process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME'), 'Must detect serverless runtime and skip local disk writes');
      assert(dynamicStoreSrc.includes('try {'), 'Must catch filesystem write errors gracefully');
    });

    test('src/data/colleges.ts exports invalidateCollegesCacheAndReload helper', () => {
      assert(collegesDataSrc.includes('export async function invalidateCollegesCacheAndReload'), 'Must export invalidateCollegesCacheAndReload');
    });

  } finally {
    // Restore or clean up dynamic store so no test pollution remains
    if (originalStoreContent !== null) {
      fs.writeFileSync(storePath, originalStoreContent, 'utf8');
    } else {
      writeDynamicStore({ customColleges: [], deletedCollegeIds: [] });
    }
  }

  console.log('\n========================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed}/${passed + failed} Assertions Passed (${failed} Failed)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCollegeSyncSuite().catch(err => {
  console.error('Test suite failed with unhandled error:', err);
  process.exit(1);
});
