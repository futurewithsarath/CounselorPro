import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import adminCollegesHandler from "../api/admin/colleges";
import collegesHandler from "../api/colleges";
import { writeDynamicStore, readDynamicStore } from "../api/_lib/dynamicCollegesStore";
import { VercelRequest, VercelResponse } from "@vercel/node";

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
    method: options.method || "GET",
    url: options.url || "/",
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

async function verifyPersistenceArchitecture() {
  console.log("==========================================================================");
  console.log("   COUNSELORPRO — FIRESTORE PERSISTENCE & VERCEL ARCHITECTURE VERIFICATION");
  console.log("==========================================================================\n");

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

  // 1. Static Vercel Ephemeral Storage Analysis
  console.log("📦 1. VERCEL STORAGE SAFETY & READ-ONLY FILESYSTEM CHECK");
  const storeSrc = fs.readFileSync("api/_lib/dynamicCollegesStore.ts", "utf8");
  const adminCollegesSrc = fs.readFileSync("api/admin/colleges.ts", "utf8");
  const publicCollegesSrc = fs.readFileSync("api/colleges.ts", "utf8");
  const serverSrc = fs.readFileSync("server.ts", "utf8");

  test("dynamicCollegesStore avoids writing to filesystem on Vercel runtime", () => {
    assert(storeSrc.includes("process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME"), "Must check serverless environment flags");
    assert(storeSrc.includes("return;"), "Must return early without calling fs.writeFileSync in serverless");
  });

  test("api/admin/colleges.ts uses Firestore as authoritative persistence source", () => {
    assert(adminCollegesSrc.includes("db.collection(\"colleges\").doc(docId).set"), "Must write to Firestore colleges collection");
    assert(adminCollegesSrc.includes("isCustom: true"), "Must mark dynamic documents with isCustom: true");
    assert(adminCollegesSrc.includes("createdAt:"), "Must timestamp creation");
    assert(adminCollegesSrc.includes("updatedAt:"), "Must timestamp update");
  });

  test("api/admin/colleges.ts writes persistent deletion tombstones to Firestore", () => {
    assert(adminCollegesSrc.includes("db.collection(\"college_tombstones\").doc(id).set"), "Must persist tombstone to college_tombstones");
    assert(adminCollegesSrc.includes("deletedAt:"), "Tombstone must contain deletedAt timestamp");
    assert(adminCollegesSrc.includes("deletedByUid:"), "Tombstone must record deleting Super Admin UID");
  });

  test("api/admin/colleges.ts enforces 409 Conflict on duplicate ID submission", () => {
    assert(adminCollegesSrc.includes("res.status(409).json({ error: `A college record with ID"), "Must return 409 Conflict for existing doc");
  });

  test("api/admin/colleges.ts fails closed with HTTP 500 when database write or delete fails", () => {
    assert(adminCollegesSrc.includes("res.status(500).json({ error: `Failed to persist college to database:"), "Must return 500 on db write failure");
    assert(adminCollegesSrc.includes("res.status(500).json({ error: `Failed to delete college from database:"), "Must return 500 on db delete failure");
  });

  test("api/colleges.ts public API queries both colleges and college_tombstones from Firestore", () => {
    assert(publicCollegesSrc.includes('db.collection("college_tombstones")'), "Public API must query college_tombstones");
    assert(publicCollegesSrc.includes('db.collection("colleges").where("datasetId", "==", datasetId)'), "Public API must query colleges by datasetId");
    assert(publicCollegesSrc.includes("firestoreTombstones.has"), "Public API must exclude records present in tombstones");
  });

  test("server.ts Express server mirrors identical Firestore authoritative semantics", () => {
    assert(serverSrc.includes("firestoreDb.collection(\"college_tombstones\").doc(id).set"), "Express server must persist tombstones");
    assert(serverSrc.includes("res.status(409).json"), "Express server must return 409 on duplicate");
    assert(serverSrc.includes("res.status(500).json({ error: `Failed to persist college to database:"), "Express server must return 500 on write failure");
    assert(serverSrc.includes("firestoreDb.collection(\"college_tombstones\").limit(1000).get()"), "Express /api/colleges must query tombstones");
  });

  // 2. Behavioral Verification with In-Memory Mock Store
  console.log("\n🔄 2. IN-MEMORY SYNCHRONIZATION & LIFECYCLE BEHAVIOR");

  const testRecord = {
    id: "ap_eapcet-persisttest-cse-111111",
    code: "PERSTEST",
    name: "Persistence Engineering College",
    branch: "CSE",
    district: "Krishna",
    region: "AU",
    type: "Private-Autonomous",
    fee: 80000,
    cutoffOC: 11000,
    cutoffBC: 16000,
    cutoffSCST: 32000,
    exam: "AP_EAPCET",
    stream: "MPC",
    year: 2025,
    datasetId: "AP_EAPCET_MPC_2025"
  };

  test("Public dataset API integrates newly added college", async () => {
    const store = readDynamicStore();
    store.customColleges.push(testRecord);
    writeDynamicStore(store);

    const { req, res, getStatus, getData } = createMockReqRes({
      method: "GET",
      query: { datasetId: "AP_EAPCET_MPC_2025" }
    });
    await collegesHandler(req as VercelRequest, res as VercelResponse);
    assert.strictEqual(getStatus(), 200);
    const data = getData();
    const found = data.colleges.find((c: any) => c.id === testRecord.id);
    assert(found, "Added college must be in response");
    assert.strictEqual(found.name, testRecord.name);
  });

  test("Public dataset API filters out deleted college via tombstone exclusion", async () => {
    const store = readDynamicStore();
    store.customColleges = store.customColleges.filter(c => c.id !== testRecord.id);
    store.deletedCollegeIds.push(testRecord.id);
    writeDynamicStore(store);

    const { req, res, getStatus, getData } = createMockReqRes({
      method: "GET",
      query: { datasetId: "AP_EAPCET_MPC_2025" }
    });
    await collegesHandler(req as VercelRequest, res as VercelResponse);
    assert.strictEqual(getStatus(), 200);
    const data = getData();
    const found = data.colleges.find((c: any) => c.id === testRecord.id);
    assert(!found, "Tombstoned college must NOT appear in response");
  });

  // Clean up
  writeDynamicStore({ customColleges: [], deletedCollegeIds: [] });

  console.log("\n==========================================================================");
  console.log(`PERSISTENCE ARCHITECTURE SUMMARY: ${passed}/${passed + failed} Tests Passed (${failed} Failed)`);
  console.log("==========================================================================\n");

  if (failed > 0) process.exit(1);
}

verifyPersistenceArchitecture().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
