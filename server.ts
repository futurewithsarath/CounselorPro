import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import compression from "compression";
import { hasValidCutoffData } from "./src/data/datasetValidation";

dotenv.config();

const app = express();
app.disable("x-powered-by");
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(compression());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

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

// Global in-memory cache for colleges list to optimize memory, prevent hitting Firestore quotas, and ensure millisecond response times
let cachedCollegesResponse: { colleges: any[]; source: string; count: number } | null = null;
let firestoreUnavailable = false;

// 1.1 API: Retrieve colleges list from Firestore with file fallback
app.get("/api/colleges-legacy", async (req, res) => {
  return res.status(410).json({ error: "Legacy unversioned college data is disabled. Use a verified datasetId." });
  const examParam = req.query.exam as string; // e.g. "AP_EAPCET_MPC"
  const yearParam = req.query.year ? Number(req.query.year) : 2025; // e.g. 2025

  try {
    let colleges: any[] = [];
    let source = "Memory fallback";

    // A. First try to load from the static JSON file directly (very fast local fallback)
    if (examParam) {
      try {
        const staticFilename = `${examParam}_${yearParam}.json`;
        const staticPath = path.join(process.cwd(), "public", "data", staticFilename);
        if (fs.existsSync(staticPath)) {
          const fileContent = fs.readFileSync(staticPath, "utf8");
          colleges = JSON.parse(fileContent);
          source = `Local Static JSON Fallback (${staticFilename})`;
          console.log(`Express API served ${colleges.length} colleges from static JSON fallback: ${staticFilename}`);
          return res.json({ colleges, source, count: colleges.length });
        }
      } catch (staticErr: any) {
        console.warn("Failed to serve colleges from static file:", staticErr.message);
      }
    }

    // B. Attempt Firestore Query (Requirement 2 & 6)
    if (firestoreDb && !firestoreUnavailable) {
      try {
        let query = firestoreDb.collection("colleges");
        if (examParam) {
          query = query.where("exam", "==", examParam);
        }
        if (yearParam) {
          query = query.where("year", "==", yearParam);
        }
        
        const snapshot = await query.limit(3000).get();
        if (!snapshot.empty) {
          snapshot.forEach((doc: any) => {
            colleges.push(doc.data());
          });
          source = `Firebase Firestore ("colleges" collection)`;
          console.log(`Express API fetched ${colleges.length} entries matching exam=${examParam}, year=${yearParam} from Firestore.`);
          return res.json({ colleges, source, count: colleges.length });
        }
      } catch (firestoreErr: any) {
        firestoreUnavailable = true;
        console.log("Firestore temporarily offline, falling back to all-colleges files.", firestoreErr.message);
      }
    }

    // C. Ultimate fallback: if everything else failed, try to combine local seed files
    if (colleges.length === 0) {
      const apMpcPath = path.join(process.cwd(), "colleges_2024.json");
      const tsMpcPath = path.join(process.cwd(), "ts_colleges_2024.json");
      
      let allFallback: any[] = [];
      if (fs.existsSync(apMpcPath)) {
        allFallback = [...allFallback, ...JSON.parse(fs.readFileSync(apMpcPath, "utf8"))];
      }
      if (fs.existsSync(tsMpcPath)) {
        allFallback = [...allFallback, ...JSON.parse(fs.readFileSync(tsMpcPath, "utf8"))];
      }

      colleges = allFallback;
      source = "Local seed file fallback combination";
    }

    return res.json({
      colleges,
      source,
      count: colleges.length
    });
  } catch (err: any) {
    console.log("Colleges retrieval API bypassed gracefully:", err.message);
    return res.json({
      colleges: [],
      source: "Emergency empty fallback",
      count: 0
    });
  }
});

app.get("/api/colleges", async (req, res) => {
  const datasetId = String(req.query.datasetId || "");
  if (!/^(AP_EAPCET|TS_EAMCET)_(MPC|BIPC)_\d{4}$/.test(datasetId)) return res.status(400).json({ error: "Provide a valid exam_stream_year datasetId." });
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

// 1. API: Analyze Web Options using Gemini
app.post("/api/ai/analyze-choices", async (req, res) => {
  const { profile, options, customPrompt } = req.body;

  if (!profile || !options || !Array.isArray(options)) {
    return res.status(400).json({ error: "Invalid profile or options provided." });
  }

  const optionsStr = options
    .map((opt: any) => `#${opt.priority}: College ${opt.collegeCode} - ${opt.collegeName} [Branch: ${opt.branch}]`)
    .join("\n");

  const prompt = customPrompt || `
  You are an expert EAPCET/EAMCET admissions counselor in South India.
  Analyze the student's web options choices, and give professional, strategic, and supportive feedback.
  
  Student Details:
  - Exam: ${profile.exam}
  - Stream: ${profile.stream || 'MPC'}
  - Rank: ${profile.rank}
  - Category: ${profile.category}
  - Region: ${profile.cutoffLocalAreaScope === 'NOT_REPORTED' ? 'Not separated in the historical cutoff source' : profile.region}
  - Gender: ${profile.gender}
  
  Selected Web Options (In Priority Order 1 to ${options.length}):
  ${optionsStr}
  
  Please provide your analysis in the following structured format (use clear headings, bullet points, and markdown):
  
  1. **Overall Evaluation**: Is the priority order logical? (For example, higher-quality/highly-coveted colleges like CBIT/JNTU/OUCE should generally be above private tier-3 colleges, and CSE should align with their rank).
  2. **Probability of Success**: Based on their rank of ${profile.rank}, which choices are "Targets" (reasonable chance), which are "Reaches" (high-ambition, lower chance), and which are "Safeties" (highly likely backup seats)? Explain the seat probability.
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

      if (customPrompt) {
        // Return a dynamic simulated response for questions
        const mockChatReply = `### AI Counselor Assistant (Simulator Mode)

*Note: running in local simulator mode. Provide a valid GEMINI_API_KEY to activate full real-time AI responses.*

That is an excellent question regarding your web options! Under the **${profile.stream || 'MPC'}** stream, your rank of **${profile.rank}** in **${profile.exam}** (under category **${profile.category}**) makes your current list of choices highly relevant. 

Specifically:
1. **Stream Fit**: Your selections align perfectly with your ${profile.stream || 'MPC'} choice.
2. **Priority Sequence**: Your current arrangement is strategically sequenced to target the highest-quality colleges first while retaining solid safeties.
3. **Refinement Suggestion**: We recommend keeping your options open and considering related specialized tracks (like Biotech/Pharm for BiPC or AIML/Data-Science for MPC) to maximize your chances!`;
        return res.json({ analysis: mockChatReply });
      }

      // Return a realistic mock response if API Key is not set, ensuring a smooth offline preview experience
      const mockReply = `### AI Counselor Analysis (Simulator Mode)

*Note: running in local simulator mode. Provide a valid GEMINI_API_KEY in the Secrets panel to activate full real-time AI analytics.*

#### 1. Overall Evaluation
Your list of **${options.length} web options** is highly structured! You have focused heavily on **${profile.exam}** engineering options under the **${profile.stream || 'MPC'}** stream. Your ranking of **${profile.rank}** puts you in a highly strategic position.

#### 2. Probability of Success
- **Reaches**: Your top choices are excellent high-ambition seats. With rank **${profile.rank}**, getting into top branches at premier institutes (like JNTU or CBIT) under the **${profile.category}** category will be highly competitive but absolutely worth attempting as top-tier preferences.
- **Targets**: Choices ranked 3 to 5 are your strongest strategic bets. Your rank aligns perfectly with the historical cutoff bands for these institutions.
- **Safeties**: Your lower choices are highly secure backups. These autonomous/private institutions historically accept ranks well beyond yours, guaranteeing you will not end up without an allotment.

#### 3. Ordering Logic Critique
Your sequence is generally **well-designed**. You have correctly followed the golden rule of counseling: **Place your absolute dream choices at the very top, followed by target colleges, and finally safeties at the bottom.** There are no invalid lower-cutoff colleges blocking your high-cutoff aspirations.

#### 4. Strategic Recommendation
- **Don't freeze too early**: Keep this simulation list saved!
- **Add 2 more options**: If you want absolute peace of mind, we recommend adding at least two more options in related branches (e.g., CSE-AIML or CSE-DS for MPC, or related Pharma/Biotech fields for BiPC) to maximize your chances.
- **You are ready**: You are doing an outstanding job practicing on the simulator. This practice prevents costly mistakes on the real day!`;
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
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Failed to query AI Counselor: " + err.message });
  }
});

// API: Expose public non-sensitive Firebase config for client-side SDK initialization
app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com` : ""),
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "",
    adminEmails: (process.env.ADMIN_EMAILS || "sarathdasireddy369@gmail.com").split(",").map(email => email.trim().toLowerCase()).filter(Boolean)
  });
});

// 1.4. API: Handle coming soon notification requests
app.post("/api/notify-request", async (req, res) => {
  try {
    const { email, examGroup } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required and must be a string." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const group = examGroup || "TS_EAPCET_BIPC";

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
    return res.status(500).json({ error: "Server error occurred: " + err.message });
  }
});

// 1.5. API: validate, authorize, and atomically replace a versioned dataset
app.post("/api/admin/upload-colleges", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Firebase ID token." });
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7), true);
    const email = (decoded.email || "").toLowerCase();
    const allowlist = (process.env.ADMIN_EMAILS || "sarathdasireddy369@gmail.com").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!decoded.email_verified || !allowlist.includes(email)) return res.status(403).json({ error: "A verified, allowlisted administrator account is required." });
    if (!firestoreDb) return res.status(503).json({ error: "Firebase server credentials are not configured." });

    const { metadata, colleges } = req.body || {};
    if (!metadata || !Array.isArray(colleges) || colleges.length < 1 || colleges.length > 5000) return res.status(400).json({ error: "Expected a versioned dataset with 1 to 5,000 records." });
    const stream = String(metadata.stream).toUpperCase() === "BIPC" ? "BiPC" : "MPC";
    const expectedId = `${metadata.exam}_${String(metadata.stream).toUpperCase()}_${metadata.year}`;
    if (metadata.datasetId !== expectedId || !["AP_EAPCET", "TS_EAMCET"].includes(metadata.exam) || !["MPC", "BIPC"].includes(String(metadata.stream).toUpperCase()) || !Number.isInteger(metadata.year)) return res.status(400).json({ error: "Invalid dataset metadata." });
    const ids = new Set<string>();
    for (const row of colleges) {
      if (!row || typeof row.id !== "string" || ids.has(row.id) || typeof row.code !== "string" || typeof row.name !== "string" || typeof row.branch !== "string" || row.exam !== metadata.exam || row.stream !== stream || row.year !== metadata.year || !hasValidCutoffData(row)) return res.status(400).json({ error: "Invalid or duplicate dataset record." });
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
    cachedCollegesResponse = null;
    firestoreUnavailable = false;
    return res.status(200).json({ message: "Dataset synchronized.", count: colleges.length, details: `${colleges.length} ${stream} records for ${metadata.exam} ${metadata.year} were synchronized.` });
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
