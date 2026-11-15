import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { getFirestoreDb, setFirestoreUnavailable } from "../_lib/index";
import { verifySuperAdmin } from "../_lib/adminAuth";

const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15 MB payload limit for bulk dataset upload

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });
  try {
    const authResult = await verifySuperAdmin(req, res);
    if (!authResult.authorized) return;
    const decoded = authResult.decoded;
    const configuredSuperAdminUid = (process.env.SUPER_ADMIN_UID || "").trim();
    if (!configuredSuperAdminUid) {
      console.error("[SECURITY] SUPER_ADMIN_UID environment variable is not configured on server. Failing closed.");
      return res.status(403).json({ error: "Administrative access denied. Server configuration is missing." });
    }
    const hasSuperAdminClaim = Boolean(decoded && decoded.role === "super_admin");
    const matchesSuperAdminUid = Boolean(decoded?.uid && decoded.uid === configuredSuperAdminUid);

    // Both conditions strictly required: verified custom claim role == 'super_admin' AND UID matches configured Super Admin UID
    if (!hasSuperAdminClaim || !matchesSuperAdminUid) {
      console.warn(`[SECURITY] Unauthorized admin upload attempt by UID "${decoded?.uid}" (claim: ${decoded?.role}). Denying.`);
      return res.status(403).json({ error: "Access denied. Only the authorized Super Admin account can manage datasets." });
    }

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

    // Multi-batch writing: Firestore limits batches to 500 operations each.
    // We insert/update new records first in batches of 400. If any write batch fails,
    // we abort without pruning existing records, reporting partial status clearly.
    let insertedBatches = 0;
    try {
      for (let offset = 0; offset < records.length; offset += 400) {
        const batch = db.batch();
        for (const row of records.slice(offset, offset + 400)) {
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

    // After successful insertion, delete stale records for this datasetId in separate batches
    try {
      const existing = await collection.where("datasetId", "==", metadata.datasetId).get();
      const staleDocs = existing.docs.filter((doc: any) => !ids.has(doc.data().id));
      for (let offset = 0; offset < staleDocs.length; offset += 400) {
        const batch = db.batch();
        staleDocs.slice(offset, offset + 400).forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (cleanupErr: any) {
      console.warn("[ADMIN UPLOAD WARNING] Stale records cleanup partially failed:", cleanupErr?.message || cleanupErr);
      setFirestoreUnavailable(false);
      return res.status(200).json({
        message: "Dataset written, but stale record cleanup partially failed.",
        count: records.length,
        datasetId: metadata.datasetId,
        warning: "Old records could not be fully pruned."
      });
    }

    setFirestoreUnavailable(false);
    return res.status(200).json({
      message: "Dataset synchronized.",
      count: records.length,
      datasetId: metadata.datasetId,
      details: `${records.length} records for ${metadata.exam} were synchronized.`
    });
  } catch (error: any) {
    console.error("Admin dataset upload failed:", error?.message || error);
    return res.status(400).json({ error: "Dataset upload failed. Check the file and server configuration." });
  }
}
