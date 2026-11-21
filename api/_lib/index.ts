import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function getServiceAccount(): {
  type: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
} | null {
  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const privateKeyId = (process.env.FIREBASE_PRIVATE_KEY_ID || "").trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const clientId = (process.env.FIREBASE_CLIENT_ID || "").trim();

  if (projectId && privateKey && clientEmail) {
    // Format private key properly if it contains escaped newlines or surrounding quotes
    let formattedPrivateKey = privateKey;
    if ((formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
        (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1);
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n').trim();

    if (formattedPrivateKey.includes("PRIVATE KEY") && formattedPrivateKey.includes("BEGIN") && formattedPrivateKey.includes("END")) {
      return {
        type: "service_account",
        project_id: projectId,
        private_key_id: privateKeyId || "",
        private_key: formattedPrivateKey,
        client_email: clientEmail,
        client_id: clientId || "",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
        universe_domain: "googleapis.com"
      };
    }
  }

  // Check GOOGLE_APPLICATION_CREDENTIALS or local serviceAccountKey.json fallback
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const json = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      if (json.project_id && json.private_key && json.client_email) return json;
    } catch {}
  }

  const localKeyPath = path.join(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      if (json.project_id && json.private_key && json.client_email) return json;
    } catch {}
  }

  return null;
}

// Lazy initialization of Firebase Admin
let firestoreDb: any = null;
let firestoreInitialized = false;

export function getFirestoreDb() {
  if (firestoreInitialized) {
    return firestoreDb;
  }

  try {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      const adminApp = getApps().length === 0 
        ? initializeApp({ credential: cert(serviceAccount as any), projectId: serviceAccount.project_id })
        : getApp();
      firestoreDb = getFirestore(adminApp);
    } else {
      const defaultProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "counselorpro";
      if (getApps().length === 0) {
        initializeApp({ projectId: defaultProjectId });
      }
    }
  } catch (err) {
    console.warn("[FIREBASE ADMIN] Lazy initialization notice in serverless helper:", err);
  }
  firestoreInitialized = true;
  return firestoreDb;
}

export function mapDistrictAbbr(dist: string): string {
  const map: Record<string, string> = {
    'VSKP': 'Visakhapatnam',
    'EG': 'East Godavari',
    'WG': 'West Godavari',
    'ATP': 'Anantapur',
    'CTR': 'Chittoor',
    'KRI': 'Krishna',
    'SKL': 'Srikakulam',
    'GNT': 'Guntur',
    'NLR': 'Nellore',
    'VSP': 'Visakhapatnam',
    'KST': 'Krishna',
    'GTR': 'Guntur',
    'NLR_': 'Nellore'
  };
  return map[dist.toUpperCase()] || dist;
}

export function mapRawToCollege(item: any, index: number, examType: string): any {
  const isGovt = item.type === 'GOVT' || String(item.type).toUpperCase() === 'GOVT';
  const typeMapped = isGovt ? 'Govt' : 'Private-Autonomous';
  const code = item.inst_code || item.code || 'UNKN';
  const branch = item.branch_code || item.branch || 'CSE';
  const actualExam = item.exam || examType;
  
  // Extract proper cutoffs
  const rawCutoffOC = item.oc_boys || item.oc_girls || item.cutoffOC;
  if (!rawCutoffOC) {
    console.warn(`[DATA WARNING] College ${code} (${branch}) is missing OC cutoff data. Falling back to default: 15000`);
  }
  const cutoffOC = Number(rawCutoffOC || 15000);

  const rawCutoffBC = item.bcb_boys || item.bca_boys || item.bcd_boys || item.cutoffBC;
  if (!rawCutoffBC) {
    console.warn(`[DATA WARNING] College ${code} (${branch}) is missing BC cutoff data. Falling back to default: 25000`);
  }
  const cutoffBC = Number(rawCutoffBC || 25000);

  const rawCutoffSCST = item.sc_boys || item.sc_girls || item.st_boys || item.cutoffSCST;
  if (!rawCutoffSCST) {
    console.warn(`[DATA WARNING] College ${code} (${branch}) is missing SC/ST cutoff data. Falling back to default: 55000`);
  }
  const cutoffSCST = Number(rawCutoffSCST || 55000);

  return {
    id: `${actualExam.toLowerCase()}-${(item.inst_code || item.code || 'col').toLowerCase()}-${(item.branch_code || item.branch || 'cse').toLowerCase()}-${index}`,
    code: item.inst_code || item.code || 'UNKN',
    name: item.institution_name || item.name || 'Unknown Institution',
    branch: item.branch_code || item.branch || 'CSE',
    district: mapDistrictAbbr(item.dist || item.district || 'OU'),
    type: typeMapped,
    fee: isGovt ? 35000 : (item.fee || 95000),
    cutoffOC,
    cutoffBC,
    cutoffSCST,
    region: item.inst_region || item.region || 'AU',
    exam: actualExam
  };
}

// Global cache objects that persist inside warm serverless containers
export let firestoreUnavailable = false;

export function setFirestoreUnavailable(value: boolean) {
  firestoreUnavailable = value;
}

// In-memory sliding window rate limiter for serverless containers
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkServerlessRateLimit(ip: string, limit: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  // Periodic cleanup of expired entries
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }

  const cleanIp = ip || "unknown_client";
  const entry = rateLimitMap.get(cleanIp);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(cleanIp, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Serverless persistent rate limiter using Firestore '_rate_limits' collection.
 * Survives across cold-starts and multiple lambda instances.
 * Falls back safely to in-memory sliding window if Firestore is unconfigured or unreachable.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const db = getFirestoreDb();
  if (db && !firestoreUnavailable) {
    try {
      const now = Date.now();
      const bucket = Math.floor(now / windowMs);
      const safeKey = crypto.createHash("sha256").update(key).digest("hex").slice(0, 32);
      const docId = `rl_${safeKey}_${bucket}`;
      const docRef = db.collection("_rate_limits").doc(docId);

      await docRef.set(
        {
          key,
          count: FieldValue.increment(1),
          expiresAt: new Date(now + windowMs * 2)
        },
        { merge: true }
      );

      const snap = await docRef.get();
      const currentCount = snap.data()?.count || 1;
      if (currentCount > limit) {
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: Math.max(0, limit - currentCount) };
    } catch (err: any) {
      console.warn("[RATE LIMIT] Firestore check failed; falling back to in-memory limiter:", err?.message || err);
    }
  }

  return checkServerlessRateLimit(key, limit, windowMs);
}

// Validation constants
export const ALLOWED_EXAM_GROUPS = new Set([
  "TS_EAPCET_BIPC",
  "TS_EAMCET_BIPC",
  "AP_EAPCET_BIPC",
  "AP_EAPCET_MPC",
  "TS_EAMCET_MPC",
  "JEE_MAIN",
  "NEET_UG"
]);

export const ALLOWED_EXAMS = new Set([
  "AP_EAPCET",
  "TS_EAMCET",
  "TG_EAPCET",
  "JEE_MAIN",
  "NEET_UG"
]);

export const ALLOWED_STREAMS = new Set([
  "MPC",
  "BIPC",
  "MBBS",
  "BDS",
  "AYUSH",
  "ENGINEERING",
  "MEDICAL"
]);

export const ALLOWED_CATEGORIES = new Set([
  "OC",
  "EWS",
  "BC_A",
  "BC_B",
  "BC_C",
  "BC_D",
  "BC_E",
  "SC",
  "ST",
  "OPEN",
  "GEN",
  "OBC",
  "OBC_NCL",
  "UR"
]);

export const ALLOWED_GENDERS = new Set([
  "BOYS",
  "GIRLS",
  "MALE",
  "FEMALE",
  "OTHER",
  "M",
  "F"
]);

export function validateProfileAndOptions(profile: any, options: any): { valid: boolean; error?: string; validatedProfile?: any; validatedOptions?: any[] } {
  if (!profile || typeof profile !== "object") {
    return { valid: false, error: "Profile object is required." };
  }

  const exam = String(profile.exam || "").trim().toUpperCase();
  if (!exam || !ALLOWED_EXAMS.has(exam)) {
    return { valid: false, error: `Invalid exam '${profile.exam}'. Allowed exams: ${Array.from(ALLOWED_EXAMS).join(", ")}.` };
  }

  const stream = profile.stream ? String(profile.stream).trim().toUpperCase() : "MPC";
  if (profile.stream && !ALLOWED_STREAMS.has(stream)) {
    return { valid: false, error: `Invalid stream '${profile.stream}'.` };
  }

  const category = String(profile.category || "").trim().toUpperCase();
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return { valid: false, error: `Invalid category '${profile.category}'.` };
  }

  const rank = typeof profile.rank === "number" ? profile.rank : Number(profile.rank);
  if (!Number.isInteger(rank) || rank < 1 || rank > 2500000) {
    return { valid: false, error: "Rank must be a positive integer up to 2,500,000." };
  }

  const gender = profile.gender ? String(profile.gender).trim().toUpperCase() : "BOYS";
  if (profile.gender && !ALLOWED_GENDERS.has(gender)) {
    return { valid: false, error: `Invalid gender '${profile.gender}'.` };
  }

  const region = profile.region ? String(profile.region).trim().slice(0, 50) : "AU";

  if (!Array.isArray(options) || options.length === 0) {
    return { valid: false, error: "Options must be a non-empty array." };
  }

  if (options.length > 50) {
    return { valid: false, error: "Options count exceeds the maximum limit of 50." };
  }

  const validatedOptions: any[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (!opt || typeof opt !== "object") {
      return { valid: false, error: `Option at index ${i} is not a valid object.` };
    }
    const priority = typeof opt.priority === "number" ? opt.priority : Number(opt.priority || i + 1);
    if (!Number.isInteger(priority) || priority < 1 || priority > 50) {
      return { valid: false, error: `Invalid priority at option ${i + 1}.` };
    }

    const collegeCode = String(opt.collegeCode || opt.code || "").trim().slice(0, 30);
    const collegeName = String(opt.collegeName || opt.name || "").trim().slice(0, 150);
    const branch = String(opt.branchName || opt.branch || "CSE").trim().slice(0, 100);

    if (!collegeCode) {
      return { valid: false, error: `Missing college code at option ${i + 1}.` };
    }

    validatedOptions.push({
      priority,
      collegeCode,
      collegeName: collegeName || collegeCode,
      branch
    });
  }

  return {
    valid: true,
    validatedProfile: {
      exam,
      stream,
      category,
      rank,
      gender,
      region,
      cutoffLocalAreaScope: profile.cutoffLocalAreaScope === "NOT_REPORTED" ? "NOT_REPORTED" : "REPORTED"
    },
    validatedOptions
  };
}

// AI Client
let aiClient: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI | null {
  const currentApiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!currentApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GEMINI_API_KEY environment variable is not configured in production.");
    }
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: currentApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'counselorpro-serverless',
        }
      }
    });
  }
  return aiClient;
}
