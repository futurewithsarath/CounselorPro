import { VercelRequest, VercelResponse } from "@vercel/node";
import { getFirestoreDb, checkServerlessRateLimit, ALLOWED_EXAM_GROUPS } from "./_lib/index";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Rate limiting (10 requests per minute per IP)
  const clientIp = (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
  const rateLimit = checkServerlessRateLimit(`notify_${clientIp}`, 10, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many notification requests. Please try again after a minute." });
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

    // Check for duplicate-email-per-examGroup
    const dupCheck = await db.collection("notify_requests")
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
    await db.collection("notify_requests").add({
      email: trimmedEmail,
      examGroup: group,
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Successfully registered for notification!",
    });
  } catch (err: any) {
    console.error("[NOTIFY SERVICE ERROR] Failed to register notification:", err);
    // Never expose raw internal error message to client
    return res.status(500).json({ error: "Failed to register notification. Please try again later." });
  }
}
