import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getFirestoreDb, setCachedColleges, setFirestoreUnavailable } from "../_lib/index";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });
  try {
    const authorization = req.headers.authorization || "";
    if (!authorization.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Firebase ID token." });
    const decoded = await getAuth().verifyIdToken(authorization.slice(7), true);
    const email = (decoded.email || "").toLowerCase();
    const allowlist = (process.env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!decoded.email_verified || !email || !allowlist.includes(email)) return res.status(403).json({ error: "A verified, allowlisted administrator account is required." });

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return res.status(413).json({ error: "Dataset exceeds the 8 MB upload limit." });
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const metadata = payload?.metadata;
    const records = payload?.colleges;
    if (!metadata || !Array.isArray(records) || records.length < 1 || records.length > 5000) return res.status(400).json({ error: "Expected a versioned dataset with 1 to 5,000 college records." });
    const isNeet = metadata.exam === "NEET_UG";
    if (!["AP_EAPCET", "TS_EAMCET", "NEET_UG"].includes(metadata.exam)) {
      return res.status(400).json({ error: "Exam must be AP_EAPCET, TS_EAMCET, or NEET_UG." });
    }
    if (!isNeet) {
      const expectedId = `${metadata.exam}_${String(metadata.stream).toUpperCase()}_${metadata.year}`;
      if (metadata.datasetId !== expectedId || !["MPC", "BIPC"].includes(String(metadata.stream).toUpperCase()) || !Number.isInteger(metadata.year)) {
        return res.status(400).json({ error: "Dataset metadata is invalid or its identifier does not match exam, stream, and year." });
      }
    }
    const ids = new Set<string>();
    for (const row of records) {
      if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id) || typeof row.code !== "string" || typeof row.name !== "string") {
        return res.status(400).json({ error: "Every record must have a unique id, code, and name." });
      }
      ids.add(row.id);
    }

    const db = getFirestoreDb();
    if (!db) return res.status(503).json({ error: "Firebase server credentials are not configured." });
    const collection = db.collection("colleges");
    for (let offset = 0; offset < records.length; offset += 400) {
      const batch = db.batch();
      for (const row of records.slice(offset, offset + 400)) batch.set(collection.doc(`${metadata.datasetId}__${row.id}`), { ...row, datasetId: metadata.datasetId, datasetMetadata: metadata });
      await batch.commit();
    }

    const existing = await collection.where("datasetId", "==", metadata.datasetId).get();
    const staleDocs = existing.docs.filter((doc: any) => !ids.has(doc.data().id));
    for (let offset = 0; offset < staleDocs.length; offset += 400) {
      const batch = db.batch();
      staleDocs.slice(offset, offset + 400).forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
    }
    setCachedColleges(null);
    setFirestoreUnavailable(false);
    return res.status(200).json({ message: "Dataset synchronized.", count: records.length, datasetId: metadata.datasetId, details: `${records.length} ${metadata.stream} records for ${metadata.exam} ${metadata.year} were synchronized.` });
  } catch (error: any) {
    console.error("Admin dataset upload failed:", error?.message || error);
    return res.status(400).json({ error: "Dataset upload failed. Check the file and server configuration." });
  }
}
