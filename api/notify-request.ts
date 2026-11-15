import { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb, checkRateLimit, ALLOWED_EXAM_GROUPS } from "./_lib/index";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Rate limiting (Strict 5 requests per minute per IP for notification sign-ups)
  const clientIp = (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
  const rateLimit = await checkRateLimit(`notify_ip_${clientIp}`, 5, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many notification requests. Please try again after 1 minute." });
  }

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

    const db = getFirestoreDb();
    if (!db) {
      console.warn("[NOTIFY SERVICE] Firebase Admin not configured. Simulating success for notify-request in-memory/development.");
      return res.status(200).json({
        success: true,
        message: "Successfully signed up! (Local development mock success)",
        simulated: true,
      });
    }

    // Eliminate TOCTOU race conditions: use deterministic SHA-256 docId with docRef.create()
    const docId = crypto.createHash("sha256").update(`${trimmedEmail}:${group}`).digest("hex");
    const docRef = db.collection("notify_requests").doc(docId);

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
      // Catch duplicate error (code 6 is ALREADY_EXISTS in Firestore / gRPC)
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
    console.error("[NOTIFY SERVICE ERROR] Failed to register notification:", err);
    // Never expose raw internal error message to client
    return res.status(500).json({ error: "Failed to register notification. Please try again later." });
  }
}
