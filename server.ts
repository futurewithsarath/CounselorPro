import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { hasValidCutoffData } from "./src/data/datasetValidation";
import { ALLOWED_EXAM_GROUPS, validateProfileAndOptions } from "./api/_lib/index";
import {
  applyDynamicModifications,
  addOrUpdateDynamicCollege,
  deleteDynamicCollege,
  readDynamicStore
} from "./api/_lib/dynamicCollegesStore";

dotenv.config();

const app = express();
app.disable("x-powered-by");
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://generativelanguage.googleapis.com https://www.google.com/recaptcha/ wss: ws:; frame-src 'self' https://*.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';");
  next();
});
app.use(compression());

// Strict 100kb payload limit globally; 15mb will be applied exclusively to /api/admin/upload-colleges
const defaultJsonParser = express.json({ limit: "100kb" });
const defaultUrlencodedParser = express.urlencoded({ limit: "100kb", extended: true });
const uploadJsonParser = express.json({ limit: "15mb" });

app.use((req, res, next) => {
  if (req.path === "/api/admin/upload-colleges") {
    return next();
  }
  defaultJsonParser(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === "/api/admin/upload-colleges") {
    return next();
  }
  defaultUrlencodedParser(req, res, next);
});

// Rate limiters for public endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI analysis requests. Please try again after 1 minute." }
});

const notifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many notification requests. Please try again after 1 minute." }
});

// Helper to construct the Firebase service account from environment variables without logging them
function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_CLIENT_ID;

  if (!projectId || !privateKey || !clientEmail) {
    return null;
  }

  // Format private key properly if it contains escaped newlines or surrounding quotes
  let formattedPrivateKey = privateKey.trim();
  if ((formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
      (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

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

// Initialize Firebase Admin globally
let firestoreDb: any = null;
try {
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    const adminApp = getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount as any), projectId: serviceAccount.project_id })
      : getApp();
    firestoreDb = getFirestore(adminApp);
    console.log("Firebase Admin successfully initialized on the backend.");
  } else {
    const defaultProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "counselorpro";
    if (getApps().length === 0) {
      initializeApp({ projectId: defaultProjectId });
    }
    console.log("Firebase credentials not fully set up in environment. Default app initialized for token verification. Firestore features will fall back gracefully.");
  }
} catch (err) {
  console.log("Failed to initialize Firebase Admin globally on server:", err);
}

let firestoreUnavailable = false;

// 1.1 API: Retrieve colleges list from Firestore with file fallback
app.get("/api/colleges-legacy", (_req, res) => {
  return res.status(410).json({ error: "Legacy unversioned college data is disabled. Use a verified datasetId." });
});

app.get("/api/colleges", async (req, res) => {
  const datasetId = String(req.query.datasetId || "");
  if (
    !/^(AP_EAPCET|TS_EAMCET)_(MPC|BIPC)_\d{4}$/.test(datasetId) &&
    !/^NEET_UG_\d{4}(_\d{4})?(_VERIFIED)?$/.test(datasetId) &&
    !/^NEET_UG_\d{4}_ROUND\d+_MCC$/.test(datasetId) &&
    !/^NMC_MBBS_\d{4}_\d{4}$/.test(datasetId) &&
    !/^JEE_MAIN(_\d{4})?$/.test(datasetId)
  ) {
    return res.status(400).json({ error: "Provide a valid exam_stream_year, NEET, or JEE datasetId." });
  }
  try {
    const firestoreTombstones = new Set<string>();
    let firestoreRecords: any[] = [];
    let isFullFirestoreDataset = false;
    let firestoreMetadata: any = null;

    if (firestoreDb && !firestoreUnavailable) {
      try {
        // 1. Fetch persistent deletion tombstones from Firestore
        const tombstoneSnap = await firestoreDb.collection("college_tombstones")
          .where("datasetId", "in", [datasetId, "ALL"])
          .get()
          .catch(() => ({ docs: [] } as any));
        
        tombstoneSnap.docs.forEach((doc: any) => {
          firestoreTombstones.add(doc.id);
          const data = doc.data();
          if (data?.id) firestoreTombstones.add(data.id);
        });

        // 2. Fetch colleges matching datasetId from Firestore
        const snapshot = await firestoreDb.collection("colleges").where("datasetId", "==", datasetId).limit(5000).get();
        if (!snapshot.empty) {
          firestoreRecords = snapshot.docs.map((doc: any) => doc.data());
          firestoreMetadata = firestoreRecords[0]?.datasetMetadata;
          if (firestoreRecords.length >= 100 && firestoreMetadata?.datasetId === datasetId) {
            isFullFirestoreDataset = true;
          }
        }
      } catch (error: any) {
        firestoreUnavailable = true;
        console.warn("Dataset Firestore lookup failed; using committed dataset.", error?.message);
      }
    }

    // Path 1: Firestore holds the authoritative full dataset
    if (isFullFirestoreDataset && firestoreMetadata) {
      const activeColleges = firestoreRecords.filter((c: any) => !firestoreTombstones.has(c.id));
      const synchronizedColleges = applyDynamicModifications(datasetId, activeColleges);
      return res.json({
        metadata: firestoreMetadata,
        colleges: synchronizedColleges,
        source: "Firebase Firestore (Authoritative)"
      });
    }

    // Path 2: Committed static base dataset with persistent Firestore overlay
    const filePath = path.join(process.cwd(), "public", "data", `${datasetId}.json`);
    if (fs.existsSync(filePath)) {
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const records = payload.records || payload.colleges;
      if (Array.isArray(records)) {
        // Filter out records deleted via Firestore tombstones
        let activeRecords = records.filter((r: any) => !firestoreTombstones.has(r.id));

        // Overlay dynamic custom additions from Firestore
        if (firestoreRecords.length > 0) {
          for (const firestoreCol of firestoreRecords) {
            if (firestoreTombstones.has(firestoreCol.id)) continue;
            const existingIdx = activeRecords.findIndex((c: any) => c.id === firestoreCol.id);
            if (existingIdx >= 0) {
              activeRecords[existingIdx] = firestoreCol;
            } else {
              activeRecords.unshift(firestoreCol);
            }
          }
        }

        // Also apply local dynamic modifications for offline/dev fallback
        const synchronizedColleges = applyDynamicModifications(datasetId, activeRecords);

        return res.json({
          metadata: payload.metadata || payload,
          colleges: synchronizedColleges,
          source: firestoreRecords.length > 0 ? "Firestore Synchronized Dataset" : "Versioned static dataset"
        });
      }
    }
    return res.status(404).json({ error: `No verified dataset is available for ${datasetId}.` });
  } catch (error: any) {
    console.error("College dataset lookup failed:", error?.message || error);
    return res.status(500).json({ error: "College dataset lookup failed." });
  }
});

// Initialize GoogleGenAI SDK on the server side
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  if (process.env.NODE_ENV === "production") {
    console.error("==========================================================================");
    console.error("⚠️  CRITICAL PRODUCTION WARNING: GEMINI_API_KEY environment variable is MISSING!");
    console.error("   AI Counselor features WILL NOT function in production without a valid API key.");
    console.error("   Please configure GEMINI_API_KEY in your deployment environment secrets.");
    console.error("==========================================================================");
  } else {
    console.warn("==========================================================================");
    console.warn("⚠️  DEVELOPMENT WARNING: GEMINI_API_KEY environment variable is not defined.");
    console.warn("   AI counselor features will run in local simulation fallback mode.");
    console.warn("==========================================================================");
  }
}
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const currentApiKey = process.env.GEMINI_API_KEY;
  if (!currentApiKey && process.env.NODE_ENV === "production") {
    throw new Error("GEMINI_API_KEY environment variable is not configured in production.");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: currentApiKey || "MOCK_KEY_FALLBACK",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: Analyze Web Options using Gemini (Rate-limited, strictly validated server-side prompt)
app.post("/api/ai/analyze-choices", aiLimiter, async (req, res) => {
  // Require verified Firebase ID token if user is logged in
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid Authorization header format. Expected Bearer token." });
    }
    const token = authHeader.slice(7).trim();
    try {
      await getAuth().verifyIdToken(token, true);
    } catch (authErr: any) {
      console.warn("[AI SERVICE] Failed to verify provided Firebase ID token:", authErr.message);
      return res.status(401).json({ error: "Invalid or expired Firebase ID token." });
    }
  }

  // Validate profile and options (strict max 50 options, length limits, allowlist for exam/stream/category)
  const { profile, options } = req.body || {};
  const validation = validateProfileAndOptions(profile, options);
  if (!validation.valid || !validation.validatedProfile || !validation.validatedOptions) {
    return res.status(400).json({ error: validation.error || "Invalid request payload." });
  }

  const { validatedProfile, validatedOptions } = validation;

  const optionsStr = validatedOptions
    .map(opt => `#${opt.priority}: College ${opt.collegeCode} - ${opt.collegeName} [Branch: ${opt.branch}]`)
    .join("\n");

  // Fixed, immutable server-side prompt — client-supplied prompts are completely rejected
  const prompt = `
  You are an expert EAPCET/EAMCET/NEET/JEE admissions counselor in South India.
  Analyze the student's web options choices, and give professional, strategic, and supportive feedback.
  
  Student Details:
  - Exam: ${validatedProfile.exam}
  - Stream: ${validatedProfile.stream}
  - Rank: ${validatedProfile.rank}
  - Category: ${validatedProfile.category}
  - Region: ${validatedProfile.cutoffLocalAreaScope === 'NOT_REPORTED' ? 'Not separated in the historical cutoff source' : validatedProfile.region}
  - Gender: ${validatedProfile.gender}
  
  Selected Web Options (In Priority Order 1 to ${validatedOptions.length}):
  ${optionsStr}
  
  Please provide your analysis in the following structured format (use clear headings, bullet points, and markdown):
  
  1. **Overall Evaluation**: Is the priority order logical? (For example, higher-quality/highly-coveted colleges like CBIT/JNTU/OUCE/AIIMS/NITs should generally be above private tier-3 colleges, and branch choices should align with their rank).
  2. **Probability of Success**: Based on their rank of ${validatedProfile.rank}, which choices are "Targets" (reasonable chance), which are "Reaches" (high-ambition, lower chance), and which are "Safeties" (highly likely backup seats)? Explain the seat probability.
  3. **Ordering Logic Critique**: Are there any issues? E.g. did they place a low-cutoff safety college ABOVE a high-cutoff dream college? (Explain why this is a mistake, as they will get allotted the safety college first and never reach the dream college).
  4. **Strategic Recommendation**: What should they do next? Should they add more safety options, move any options up/down, or choose other branches? Give positive, encouraging, and clear guidance.
  
  Keep the tone professional, friendly, objective, and deeply encouraging. Avoid dry developer jargon. Focus purely on realistic counseling.
  `;

  try {
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        console.error("Blocked AI analysis request in production because GEMINI_API_KEY is not defined.");
        return res.status(500).json({ error: "AI analysis is temporarily unavailable. GEMINI_API_KEY environment variable is missing on this production server." });
      }

      // Return a realistic mock response if API Key is not set in development
      const mockReply = `### AI Counselor Analysis (Simulator Mode)

*Note: running in local simulator mode. Provide a valid GEMINI_API_KEY in the Secrets panel to activate full real-time AI analytics.*

#### 1. Overall Evaluation
Your list of **${validatedOptions.length} web options** is highly structured! You have focused heavily on **${validatedProfile.exam}** options under the **${validatedProfile.stream}** stream. Your ranking of **${validatedProfile.rank}** puts you in a highly strategic position.

#### 2. Probability of Success
- **Reaches**: Your top choices are excellent high-ambition seats. With rank **${validatedProfile.rank}**, getting into top branches under the **${validatedProfile.category}** category will be highly competitive but absolutely worth attempting as top-tier preferences.
- **Targets**: Choices ranked 3 to 5 are your strongest strategic bets. Your rank aligns perfectly with historical cutoff bands.
- **Safeties**: Your lower choices are highly secure backups.

#### 3. Ordering Logic Critique
Your sequence is generally **well-designed**. You have correctly followed the golden rule of counseling: **Place your absolute dream choices at the very top, followed by target colleges, and finally safeties at the bottom.**

#### 4. Strategic Recommendation
- **Don't freeze too early**: Keep this simulation list saved!
- **Add safety buffer**: Maintain at least 2 to 3 solid safety options.
- **You are ready**: You are doing an outstanding job practicing on the simulator.`;
      return res.json({ analysis: mockReply });
    }

    const client = getAIClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const analysisText = response.text || "No response received from counselor AI.";
    res.json({ analysis: analysisText });

  } catch (err: any) {
    console.error("[AI SERVICE ERROR] Gemini API Error:", err);
    if (err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("quota")) {
      return res.status(429).json({ error: "AI service quota temporarily exceeded. Please try again in a few moments." });
    }
    res.status(500).json({ error: "Failed to generate AI analysis. Please try again later." });
  }
});

// API: Expose public non-sensitive Firebase config for client-side SDK initialization
app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyAgfXQFSoGjvSxmskHK4tu97Tt0DopngAg",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "counselorpro.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "counselorpro",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:289926335025:web:a061b899b2a0a68476a310",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "counselorpro.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "289926335025",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-RZME2N1DTD"
  });
});

// 1.4. API: Handle coming soon notification requests (Rate-limited, allowlisted, generic error on failure)
app.post("/api/notify-request", notifyLimiter, async (req, res) => {
  try {
    const { email, examGroup } = req.body || {};

    if (!email || typeof email !== "string" || email.length > 254) {
      return res.status(400).json({ error: "A valid email string (under 254 characters) is required." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const group = examGroup ? String(examGroup).trim() : "TS_EAPCET_BIPC";
    if (!ALLOWED_EXAM_GROUPS.has(group)) {
      return res.status(400).json({ error: `Invalid examGroup. Allowed groups: ${Array.from(ALLOWED_EXAM_GROUPS).join(", ")}.` });
    }

    if (!firestoreDb) {
      console.warn("[NOTIFY SERVICE] Firebase Admin not configured. Simulating success for notify-request in local development.");
      return res.status(200).json({
        success: true,
        message: "Successfully signed up! (Local development mock success)",
        simulated: true,
      });
    }

    // Eliminate TOCTOU race condition: deterministic SHA-256 docId with docRef.create()
    const docId = crypto.createHash("sha256").update(`${trimmedEmail}:${group}`).digest("hex");
    const docRef = firestoreDb.collection("notify_requests").doc(docId);

    try {
      await docRef.create({
        email: trimmedEmail,
        examGroup: group,
        createdAt: FieldValue.serverTimestamp()
      });

      return res.status(200).json({
        success: true,
        message: "Successfully registered for notification!",
      });
    } catch (createErr: any) {
      if (createErr.code === 6 || createErr.message?.includes("ALREADY_EXISTS")) {
        return res.status(200).json({
          success: true,
          message: "You are already registered for notification!",
          alreadyExists: true,
        });
      }
      throw createErr;
    }
  } catch (err: any) {
    console.error("[NOTIFY SERVICE ERROR] Failed to register notification in local server:", err);
    return res.status(500).json({ error: "Failed to register notification. Please try again later." });
  }
});

// 1.5. Mandatory Super Admin Authorization Gate for all administrative APIs (/api/admin/*)
app.use("/api/admin/*", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Firebase ID token. Bearer authentication required." });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: "Empty Firebase ID token provided." });
    }
    const decoded = await getAuth().verifyIdToken(token, true);
    const configuredSuperAdminUid = (process.env.SUPER_ADMIN_UID || "").trim();
    if (!configuredSuperAdminUid) {
      console.error("[SECURITY] SUPER_ADMIN_UID environment variable is not configured on server. Failing closed.");
      return res.status(403).json({ error: "Administrative access denied. Server configuration is missing." });
    }
    const hasSuperAdminClaim = Boolean(decoded && decoded.role === "super_admin");
    const matchesSuperAdminUid = Boolean(decoded?.uid && decoded.uid === configuredSuperAdminUid);

    // Both conditions strictly required: verified custom claim role == 'super_admin' AND UID matches SUPER_ADMIN_UID
    if (!hasSuperAdminClaim || !matchesSuperAdminUid) {
      console.warn(`[SECURITY] Unauthorized administrative API request to ${req.originalUrl} by UID "${decoded?.uid}" (claim: ${decoded?.role}). Denying.`);
      return res.status(403).json({ error: "Access denied. Only the authorized Super Admin account can access administrative endpoints." });
    }
    (req as any).superAdmin = decoded;
    next();
  } catch (err: any) {
    console.warn(`[SECURITY] Administrative API token verification failed on ${req.originalUrl}:`, err?.message || err);
    return res.status(401).json({ error: "Invalid, expired, or malformed Firebase ID token." });
  }
});

// 1.6. API: validate, authorize, and atomically replace a versioned dataset (Strict 15mb body limit applied here only)
app.post("/api/admin/upload-colleges", uploadJsonParser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Firebase ID token." });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7), true);
    const configuredSuperAdminUid = (process.env.SUPER_ADMIN_UID || "").trim();
    if (!configuredSuperAdminUid) {
      console.error("[SECURITY] SUPER_ADMIN_UID environment variable is not configured on server. Failing closed.");
      return res.status(403).json({ error: "Administrative access denied. Server configuration is missing." });
    }
    const hasSuperAdminClaim = Boolean(decoded && decoded.role === "super_admin");
    const matchesSuperAdminUid = Boolean(decoded?.uid && decoded.uid === configuredSuperAdminUid);

    // Both conditions strictly required: verified custom claim role == 'super_admin' AND UID matches SUPER_ADMIN_UID
    if (!hasSuperAdminClaim || !matchesSuperAdminUid) {
      console.warn(`[SECURITY] Unauthorized admin upload attempt by UID "${decoded?.uid}" (claim: ${decoded?.role}). Denying.`);
      return res.status(403).json({ error: "Access denied. Only the authorized Super Admin account can manage datasets." });
    }
    if (!firestoreDb) return res.status(503).json({ error: "Firebase server credentials are not configured." });

    const { metadata, colleges } = req.body || {};
    if (!metadata || !Array.isArray(colleges) || colleges.length < 1 || colleges.length > 5000) return res.status(400).json({ error: "Expected a versioned dataset with 1 to 5,000 records." });

    const isNeet = metadata.exam === "NEET_UG";
    if (!["AP_EAPCET", "TS_EAMCET", "NEET_UG"].includes(metadata.exam)) {
      return res.status(400).json({ error: "Exam must be AP_EAPCET, TS_EAMCET, or NEET_UG." });
    }
    if (!isNeet) {
      const expectedId = `${metadata.exam}_${String(metadata.stream).toUpperCase()}_${metadata.year}`;
      if (metadata.datasetId !== expectedId || !["MPC", "BIPC"].includes(String(metadata.stream).toUpperCase()) || !Number.isInteger(metadata.year)) {
        return res.status(400).json({ error: "Invalid dataset metadata." });
      }
    }
    const ids = new Set<string>();
    for (const row of colleges) {
      if (!row || typeof row.id !== "string" || ids.has(row.id) || typeof row.code !== "string" || typeof row.name !== "string") {
        return res.status(400).json({ error: "Invalid or duplicate dataset record." });
      }
      ids.add(row.id);
    }
    const collection = firestoreDb.collection("colleges");

    // Multi-batch writing: Firestore limits batches to 500 operations each.
    // Insert/update new records first in batches of 400. If any write batch fails, abort without deleting stale records.
    let insertedBatches = 0;
    try {
      for (let offset = 0; offset < colleges.length; offset += 400) {
        const batch = firestoreDb.batch();
        for (const row of colleges.slice(offset, offset + 400)) {
          batch.set(collection.doc(`${metadata.datasetId}__${row.id}`), { ...row, datasetId: metadata.datasetId, datasetMetadata: metadata });
        }
        await batch.commit();
        insertedBatches++;
      }
    } catch (writeErr: any) {
      console.error("[ADMIN UPLOAD ERROR] Partial batch write failure:", writeErr?.message || writeErr);
      return res.status(500).json({
        error: "Partial dataset write failure. Some batches could not be written to Firestore.",
        batchesCommitted: insertedBatches
      });
    }

    // Delete stale records in separate batches
    try {
      const existing = await collection.where("datasetId", "==", metadata.datasetId).get();
      const stale = existing.docs.filter((doc: any) => !ids.has(doc.data().id));
      for (let offset = 0; offset < stale.length; offset += 400) {
        const batch = firestoreDb.batch();
        stale.slice(offset, offset + 400).forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (cleanupErr: any) {
      console.warn("[ADMIN UPLOAD WARNING] Stale records cleanup partially failed:", cleanupErr?.message || cleanupErr);
      firestoreUnavailable = false;
      return res.status(200).json({
        message: "Dataset written, but stale record cleanup partially failed.",
        count: colleges.length,
        datasetId: metadata.datasetId,
        warning: "Old records could not be fully pruned."
      });
    }

    firestoreUnavailable = false;
    return res.status(200).json({
      message: "Dataset synchronized.",
      count: colleges.length,
      datasetId: metadata.datasetId,
      details: `${colleges.length} records for ${metadata.exam} were synchronized.`
    });
  } catch (err: any) {
    console.error("Admin dataset upload failed:", err?.message || err);
    return res.status(400).json({ error: "Dataset upload failed. Check the file and server configuration." });
  }
});

// 1.7. API: Retrieve custom and dynamically synchronized colleges list (Super Admin Only)
app.get("/api/admin/colleges", async (_req, res) => {
  try {
    if (firestoreDb && !firestoreUnavailable) {
      try {
        const [customSnap, tombstoneSnap] = await Promise.all([
          firestoreDb.collection("colleges").where("isCustom", "==", true).limit(500).get().catch(() => null),
          firestoreDb.collection("college_tombstones").limit(1000).get().catch(() => null)
        ]);

        const firestoreCustom = customSnap && !customSnap.empty ? customSnap.docs.map((d: any) => d.data()) : [];
        const firestoreDeleted = tombstoneSnap && !tombstoneSnap.empty ? tombstoneSnap.docs.map((d: any) => d.id) : [];

        if (firestoreCustom.length > 0 || firestoreDeleted.length > 0) {
          return res.status(200).json({
            success: true,
            customColleges: firestoreCustom,
            deletedCollegeIds: firestoreDeleted,
            source: "Firebase Firestore (Authoritative)"
          });
        }
      } catch (dbErr: any) {
        console.warn("[ADMIN COLLEGES GET] Firestore query fallback to local store:", dbErr?.message || dbErr);
      }
    }

    const store = readDynamicStore();
    return res.status(200).json({
      success: true,
      customColleges: store.customColleges,
      deletedCollegeIds: store.deletedCollegeIds,
      lastUpdated: store.lastUpdated,
      source: "Local Store Fallback"
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read colleges store." });
  }
});

// 1.8. API: Register and persist an individual college record (Super Admin Only)
app.post("/api/admin/colleges", async (req, res) => {
  try {
    const {
      code,
      name,
      branch,
      district,
      region,
      type,
      fee,
      cutoffOC,
      cutoffBC,
      cutoffSCST,
      exam,
      stream,
      year,
      affiliatingUniversity,
      place
    } = req.body || {};

    if (!code || typeof code !== "string" || code.trim().length < 2) {
      return res.status(400).json({ error: "College code is required (at least 2 characters)." });
    }
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return res.status(400).json({ error: "College name is required (at least 3 characters)." });
    }

    const validExams = ["AP_EAPCET", "TS_EAMCET", "JEE_MAIN", "NEET_UG"];
    const validatedExam = validExams.includes(exam) ? exam : "AP_EAPCET";
    const validatedStream = stream || (validatedExam === "NEET_UG" ? "NEET" : validatedExam === "JEE_MAIN" ? "JoSAA" : "MPC");
    const validatedYear = Number.isInteger(year) ? year : 2025;
    const validatedCode = code.trim().toUpperCase();
    const validatedBranch = (branch || "CSE").trim().toUpperCase();

    // Clean ID format
    const cleanCode = validatedCode.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanBranch = validatedBranch.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanExam = validatedExam.toLowerCase().replace(/[^a-z0-9]/g, "");
    const generatedId = `${cleanExam}-${cleanCode}-${cleanBranch}-${Date.now()}`;
    const collegeId = req.body.id && typeof req.body.id === "string" ? req.body.id : generatedId;

    // Dataset identifier
    let datasetId: string;
    if (validatedExam === "AP_EAPCET" || validatedExam === "TS_EAMCET") {
      datasetId = `${validatedExam}_${validatedStream.toUpperCase() === "BIPC" ? "BIPC" : "MPC"}_${validatedYear}`;
    } else if (validatedExam === "NEET_UG") {
      datasetId = `NEET_UG_${validatedYear}_2025`;
    } else {
      datasetId = `JEE_MAIN_${validatedYear}`;
    }

    // Duplicate check in Firestore
    if (firestoreDb && !firestoreUnavailable) {
      try {
        const docRef = firestoreDb.collection("colleges").doc(`${datasetId}__${collegeId}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          return res.status(409).json({ error: `A college record with ID "${collegeId}" already exists in ${datasetId}.` });
        }
        const duplicateQuery = await firestoreDb.collection("colleges").where("id", "==", collegeId).limit(1).get();
        if (!duplicateQuery.empty) {
          return res.status(409).json({ error: `A college record with ID "${collegeId}" already exists.` });
        }
      } catch (checkErr: any) {
        console.warn("[ADMIN ADD COLLEGE] Firestore duplicate check warning:", checkErr?.message);
      }
    }

    const ocVal = cutoffOC !== null && cutoffOC !== undefined ? Number(cutoffOC) : 25000;
    const bcVal = cutoffBC !== null && cutoffBC !== undefined ? Number(cutoffBC) : 35000;
    const scstVal = cutoffSCST !== null && cutoffSCST !== undefined ? Number(cutoffSCST) : 50000;

    const defaultCategoryCutoffs = {
      OC: { Boys: ocVal, Girls: ocVal },
      BC_A: { Boys: bcVal, Girls: bcVal },
      BC_B: { Boys: bcVal, Girls: bcVal },
      BC_C: { Boys: bcVal, Girls: bcVal },
      BC_D: { Boys: bcVal, Girls: bcVal },
      BC_E: { Boys: bcVal, Girls: bcVal },
      SC_I: { Boys: scstVal, Girls: scstVal },
      SC_II: { Boys: scstVal, Girls: scstVal },
      SC_III: { Boys: scstVal, Girls: scstVal },
      ST: { Boys: scstVal, Girls: scstVal },
      OC_EWS: { Boys: ocVal, Girls: ocVal }
    };

    const collegeRecord = {
      id: collegeId,
      code: validatedCode,
      name: name.trim(),
      branch: validatedBranch,
      district: district ? String(district).trim() : "Unknown",
      region: region ? String(region).trim() : "AU",
      type: type ? String(type).trim() : "Private-Autonomous",
      fee: fee !== null && fee !== undefined ? Number(fee) : null,
      cutoffOC: ocVal,
      cutoffBC: bcVal,
      cutoffSCST: scstVal,
      exam: validatedExam,
      stream: validatedStream,
      year: validatedYear,
      affiliatingUniversity: affiliatingUniversity ? String(affiliatingUniversity).trim() : null,
      place: place ? String(place).trim() : null,
      datasetId,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cutoffsByLocalArea: {
        AU: defaultCategoryCutoffs,
        SVU: defaultCategoryCutoffs,
        OU: defaultCategoryCutoffs
      }
    };

    // 1. Authoritative Persistence: Write to Firestore if available
    if (firestoreDb && !firestoreUnavailable) {
      try {
        const docId = `${datasetId}__${collegeId}`;
        await firestoreDb.collection("colleges").doc(docId).set({
          ...collegeRecord,
          datasetId,
          datasetMetadata: {
            datasetId,
            exam: validatedExam,
            stream: validatedStream,
            year: validatedYear
          }
        });
        // Remove from persistent tombstones if it was previously marked deleted
        await firestoreDb.collection("college_tombstones").doc(collegeId).delete().catch(() => {});
      } catch (dbErr: any) {
        console.error("[ADMIN ADD COLLEGE] Firestore doc write failed:", dbErr?.message || dbErr);
        return res.status(500).json({ error: `Failed to persist college to database: ${dbErr?.message || "Internal database error"}` });
      }
    }

    // 2. Persist to dynamic store for disk / offline synchronization
    addOrUpdateDynamicCollege(collegeRecord);

    return res.status(201).json({
      success: true,
      college: collegeRecord,
      message: `College "${collegeRecord.name}" (${collegeRecord.code}) successfully registered and synchronized.`
    });
  } catch (err: any) {
    console.error("[ADMIN ADD COLLEGE ERROR]", err);
    return res.status(500).json({ error: "Failed to create college record." });
  }
});

// 1.9. API: Delete an individual college record (Super Admin Only)
app.delete("/api/admin/colleges/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "College ID is required for deletion." });
    }

    const datasetId = (req.query.datasetId as string | undefined) || req.body?.datasetId;

    // 1. Authoritative Persistence: Delete from Firestore & record persistent tombstone
    if (firestoreDb && !firestoreUnavailable) {
      try {
        if (datasetId) {
          await firestoreDb.collection("colleges").doc(`${datasetId}__${id}`).delete().catch(() => {});
        }
        const snapshot = await firestoreDb.collection("colleges").where("id", "==", id).get();
        if (!snapshot.empty) {
          const batch = firestoreDb.batch();
          snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }

        // Persistent Deletion Tombstone in Firestore
        await firestoreDb.collection("college_tombstones").doc(id).set({
          id,
          datasetId: datasetId || "ALL",
          deletedAt: new Date().toISOString(),
          deletedByUid: (req as any).superAdmin?.uid || "SUPER_ADMIN"
        });
      } catch (dbErr: any) {
        console.error("[ADMIN DELETE COLLEGE] Firestore deletion failed:", dbErr?.message || dbErr);
        return res.status(500).json({ error: `Failed to delete college from database: ${dbErr?.message || "Internal database error"}` });
      }
    }

    // 2. Mark as deleted in dynamic store
    deleteDynamicCollege(id);

    return res.status(200).json({
      success: true,
      id,
      message: `College record "${id}" successfully deleted and tombstone recorded in Firestore.`
    });
  } catch (err: any) {
    console.error("[ADMIN DELETE COLLEGE ERROR]", err);
    return res.status(500).json({ error: "Failed to delete college record." });
  }
});

app.delete("/api/admin/colleges", async (req, res) => {
  try {
    const queryId = req.query.id as string | undefined;
    const bodyId = (req.body?.id || req.body?.collegeId) as string | undefined;
    const id = queryId || bodyId;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "College ID is required for deletion." });
    }

    const datasetId = (req.query.datasetId as string | undefined) || req.body?.datasetId;

    // 1. Authoritative Persistence: Delete from Firestore & record persistent tombstone
    if (firestoreDb && !firestoreUnavailable) {
      try {
        if (datasetId) {
          await firestoreDb.collection("colleges").doc(`${datasetId}__${id}`).delete().catch(() => {});
        }
        const snapshot = await firestoreDb.collection("colleges").where("id", "==", id).get();
        if (!snapshot.empty) {
          const batch = firestoreDb.batch();
          snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }

        // Persistent Deletion Tombstone in Firestore
        await firestoreDb.collection("college_tombstones").doc(id).set({
          id,
          datasetId: datasetId || "ALL",
          deletedAt: new Date().toISOString(),
          deletedByUid: (req as any).superAdmin?.uid || "SUPER_ADMIN"
        });
      } catch (dbErr: any) {
        console.error("[ADMIN DELETE COLLEGE] Firestore deletion failed:", dbErr?.message || dbErr);
        return res.status(500).json({ error: `Failed to delete college from database: ${dbErr?.message || "Internal database error"}` });
      }
    }

    // 2. Mark as deleted in dynamic store
    deleteDynamicCollege(id);

    return res.status(200).json({
      success: true,
      id,
      message: `College record "${id}" successfully deleted and tombstone recorded in Firestore.`
    });
  } catch (err: any) {
    console.error("[ADMIN DELETE COLLEGE ERROR]", err);
    return res.status(500).json({ error: "Failed to delete college record." });
  }
});

// 1.10. API: Update an individual college record (Super Admin Only)
app.put("/api/admin/colleges/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "College ID is required for update." });
    }

    const datasetId = (req.query.datasetId as string | undefined) || req.body?.datasetId;
    const updates = { ...(req.body || {}) };
    delete updates.id; // Preserve immutable ID
    updates.updatedAt = new Date().toISOString();

    // 1. Update in Firestore if available
    if (firestoreDb && !firestoreUnavailable) {
      try {
        const snapshot = await firestoreDb.collection("colleges").where("id", "==", id).get();
        if (!snapshot.empty) {
          const batch = firestoreDb.batch();
          snapshot.docs.forEach((doc: any) => batch.update(doc.ref, updates));
          await batch.commit();
        } else if (datasetId) {
          const directDoc = await firestoreDb.collection("colleges").doc(`${datasetId}__${id}`).get();
          if (directDoc.exists) {
            await directDoc.ref.update(updates);
          } else {
            return res.status(404).json({ error: `College record "${id}" not found to update.` });
          }
        } else {
          return res.status(404).json({ error: `College record "${id}" not found to update.` });
        }
      } catch (dbErr: any) {
        console.error("[ADMIN UPDATE COLLEGE] Firestore update failed:", dbErr?.message || dbErr);
        return res.status(500).json({ error: `Failed to update college in database: ${dbErr?.message || "Internal database error"}` });
      }
    }

    // 2. Update in dynamic store
    addOrUpdateDynamicCollege({ id, ...updates });

    return res.status(200).json({
      success: true,
      id,
      message: `College record "${id}" updated successfully.`
    });
  } catch (err: any) {
    console.error("[ADMIN UPDATE COLLEGE ERROR]", err);
    return res.status(500).json({ error: "Failed to update college record." });
  }
});

// Explicit 404 for unhandled API endpoints
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// 2. Serve Vite dev server or production static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
