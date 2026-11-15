import fs from "node:fs";
import path from "node:path";
import { College } from "../../src/types";

export interface DynamicStoreData {
  customColleges: any[];
  deletedCollegeIds: string[];
  lastUpdated?: string;
}

const STORE_PATH = path.join(process.cwd(), "public", "data", "dynamic_colleges.json");

/**
 * Safely reads the persistent dynamic changes store from public/data/dynamic_colleges.json.
 * Contains colleges created/updated by administrators and IDs of deleted colleges.
 */
export function readDynamicStore(): DynamicStoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const data = JSON.parse(raw);
      return {
        customColleges: Array.isArray(data.customColleges) ? data.customColleges : [],
        deletedCollegeIds: Array.isArray(data.deletedCollegeIds) ? data.deletedCollegeIds : [],
        lastUpdated: data.lastUpdated
      };
    }
  } catch (err: any) {
    console.warn("[DYNAMIC STORE] Could not read dynamic store:", err?.message || err);
  }
  return { customColleges: [], deletedCollegeIds: [] };
}

/**
 * Persists the dynamic store to public/data/dynamic_colleges.json.
 * Safe for serverless environments where project directory is read-only.
 */
export function writeDynamicStore(data: DynamicStoreData): void {
  try {
    // In serverless production environments (e.g. Vercel), project files are read-only.
    // Dynamic changes must be stored in Firestore, not the local filesystem.
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return;
    }
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      customColleges: data.customColleges,
      deletedCollegeIds: data.deletedCollegeIds,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch (err: any) {
    console.warn("[DYNAMIC STORE] Local filesystem write skipped or unavailable:", err?.message || err);
  }
}

/**
 * Adds or updates a college record in the persistent dynamic store.
 * Automatically clears any prior deletion flag for this college ID.
 */
export function addOrUpdateDynamicCollege(college: any): void {
  const store = readDynamicStore();
  
  // Remove from deleted list if present
  store.deletedCollegeIds = store.deletedCollegeIds.filter(id => id !== college.id);

  // Update existing or prepend new
  const existingIdx = store.customColleges.findIndex(c => c.id === college.id);
  if (existingIdx >= 0) {
    store.customColleges[existingIdx] = { ...store.customColleges[existingIdx], ...college };
  } else {
    store.customColleges.unshift(college);
  }

  writeDynamicStore(store);
}

/**
 * Marks a college as deleted in the dynamic store.
 * Removes it from customColleges and records the ID in deletedCollegeIds so it is
 * filtered out from both custom and base JSON datasets.
 */
export function deleteDynamicCollege(collegeId: string): void {
  const store = readDynamicStore();

  // Remove from custom colleges
  store.customColleges = store.customColleges.filter(c => c.id !== collegeId);

  // Add to deleted IDs if not already there
  if (!store.deletedCollegeIds.includes(collegeId)) {
    store.deletedCollegeIds.push(collegeId);
  }

  writeDynamicStore(store);
}

/**
 * Checks if a custom college matches a requested datasetId.
 */
export function matchesDataset(college: any, datasetId: string): boolean {
  if (college.datasetId && college.datasetId === datasetId) {
    return true;
  }

  // AP EAPCET MPC
  if (datasetId.startsWith("AP_EAPCET_MPC")) {
    return college.exam === "AP_EAPCET" && (!college.stream || college.stream === "MPC");
  }

  // AP EAPCET BIPC
  if (datasetId.startsWith("AP_EAPCET_BIPC")) {
    return college.exam === "AP_EAPCET" && college.stream === "BiPC";
  }

  // TS EAMCET MPC
  if (datasetId.startsWith("TS_EAMCET_MPC")) {
    return college.exam === "TS_EAMCET" && (!college.stream || college.stream === "MPC");
  }

  // TS EAMCET BIPC
  if (datasetId.startsWith("TS_EAMCET_BIPC")) {
    return college.exam === "TS_EAMCET" && college.stream === "BiPC";
  }

  // NEET UG
  if (datasetId.startsWith("NEET_UG") || datasetId.startsWith("NMC_MBBS")) {
    return college.exam === "NEET_UG";
  }

  // JEE MAIN
  if (datasetId.startsWith("JEE_MAIN")) {
    return college.exam === "JEE_MAIN";
  }

  return false;
}

/**
 * Applies dynamic store modifications (custom additions and deletions)
 * to any collection of college records for a given datasetId.
 */
export function applyDynamicModifications(datasetId: string, baseColleges: any[]): any[] {
  const store = readDynamicStore();
  const deletedSet = new Set(store.deletedCollegeIds);

  // 1. Filter out deleted records
  const filtered = baseColleges.filter(c => !deletedSet.has(c.id));

  // 2. Find matching custom colleges for this dataset
  const matchingCustom = store.customColleges.filter(c => matchesDataset(c, datasetId));

  // 3. Merge or prepend custom records
  const result = [...filtered];
  for (const customCol of matchingCustom) {
    const existingIdx = result.findIndex(c => c.id === customCol.id);
    if (existingIdx >= 0) {
      result[existingIdx] = { ...result[existingIdx], ...customCol };
    } else {
      result.unshift(customCol);
    }
  }

  return result;
}
