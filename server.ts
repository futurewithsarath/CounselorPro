import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { hasValidCutoffData } from "./src/data/datasetValidation";
import { ALLOWED_EXAM_GROUPS, validateProfileAndOptions } from "./api/_lib/index";

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
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://generativelanguage.googleapis.com wss: ws:; frame-src 'self' https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';");
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
  max: 10,
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

  // Format private key properly if it contains escaped newlines
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

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
    console.log("Firebase credentials not fully set up in environment. Firestore features will fall back gracefully.");
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
    !/^NMC_MBBS_\d{4}_\d{4}$/.test(datasetId)
  ) {
    return res.status(400).json({ error: "Provide a valid exam_stream_year or NEET datasetId." });
  }
  try {
    if (firestoreDb && !firestoreUnavailable) {
      try {
        const snapshot = await firestoreDb.collection("colleges").where("datasetId", "==", datasetId).limit(5000).get();
        if (!snapshot.empty) {
          const colleges = snapshot.docs.map((doc: any) => doc.data());
          const metadata = colleges[0]?.datasetMetadata;
          if (metadata?.datasetId === datasetId) return res.json({ metadata, colleges, source: "Firebase Firestore" });
        }
      } catch (error: any) {
        firestoreUnavailable = true;
        console.warn("Dataset Firestore lookup failed; using the committed dataset.", error?.message);
      }
    }
    const filePath = path.join(process.cwd(), "public", "data", `${datasetId}.json`);
    if (fs.existsSync(filePath)) {
      const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (payload?.metadata?.datasetId === datasetId && Array.isArray(payload.colleges)) return res.json({ ...payload, source: "Versioned static dataset" });
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
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FALLBACK",
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const analysisText = response.text || "No response received from counselor AI.";
    res.json({ analysis: analysisText });

  } catch (err: any) {
    console.error("[AI SERVICE ERROR] Gemini API Error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis. Please try again later." });
  }
});

// API: Expose public non-sensitive Firebase config for client-side SDK initialization
app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com` : ""),
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || ""
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

    // Check for duplicate-email-per-examGroup
    const dupCheck = await firestoreDb.collection("notify_requests")
      .where("email", "==", trimmedEmail)
      .where("examGroup", "==", group)
      .limit(1)
      .get();

    if (!dupCheck.empty) {
      return res.status(200).json({
        success: true,
        message: "You are already registered for notification!",
        alreadyExists: true,
      });
    }

    // Write a document with { email, examGroup, timestamp: server timestamp }
    await firestoreDb.collection("notify_requests").add({
      email: trimmedEmail,
      examGroup: group,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Successfully registered for notification!",
    });
  } catch (err: any) {
    console.error("[NOTIFY SERVICE ERROR] Failed to register notification in local server:", err);
    return res.status(500).json({ error: "Failed to register notification. Please try again later." });
  }
});

// 1.5. API: validate, authorize, and atomically replace a versioned dataset (Strict 15mb body limit applied here only)
app.post("/api/admin/upload-colleges", uploadJsonParser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Firebase ID token." });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7), true);
    const email = (decoded.email || "").toLowerCase();

    // Fail closed if ADMIN_EMAILS environment variable is missing or empty
    const adminEmailsEnv = process.env.ADMIN_EMAILS;
    if (!adminEmailsEnv || !adminEmailsEnv.trim()) {
      console.error("[SECURITY] ADMIN_EMAILS environment variable is not configured. Failing closed.");
      return res.status(403).json({ error: "Administrator allowlist is not configured on this server." });
    }
    const allowlist = adminEmailsEnv.split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (allowlist.length === 0 || !decoded.email_verified || !email || !allowlist.includes(email)) {
      return res.status(403).json({ error: "A verified, allowlisted administrator account is required." });
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
    for (let offset = 0; offset < colleges.length; offset += 400) {
      const batch = firestoreDb.batch();
      for (const row of colleges.slice(offset, offset + 400)) batch.set(collection.doc(`${metadata.datasetId}__${row.id}`), { ...row, datasetId: metadata.datasetId, datasetMetadata: metadata });
      await batch.commit();
    }
    const existing = await collection.where("datasetId", "==", metadata.datasetId).get();
    const stale = existing.docs.filter((doc: any) => !ids.has(doc.data().id));
    for (let offset = 0; offset < stale.length; offset += 400) {
      const batch = firestoreDb.batch();
      stale.slice(offset, offset + 400).forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
    }
    firestoreUnavailable = false;
    return res.status(200).json({ message: "Dataset synchronized.", count: colleges.length, details: `${colleges.length} records for ${metadata.exam} ${metadata.year} were synchronized.` });
  } catch (err: any) {
    console.error("Admin dataset upload failed:", err?.message || err);
    return res.status(400).json({ error: "Dataset upload failed. Check the file and server configuration." });
  }
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
