import { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "node:fs";
import path from "node:path";
import { getFirestoreDb, firestoreUnavailable, setFirestoreUnavailable } from "./_lib/index";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed. Use GET." });
  const datasetId = String(req.query.datasetId || "");
  if (!/^(AP_EAPCET|TS_EAMCET)_(MPC|BIPC)_\d{4}$/.test(datasetId)) return res.status(400).json({ error: "Provide a valid exam_stream_year datasetId." });
  try {
    const db = getFirestoreDb();
    if (db && !firestoreUnavailable) {
      try {
        const snapshot = await db.collection("colleges").where("datasetId", "==", datasetId).limit(5000).get();
        if (!snapshot.empty) {
          const colleges = snapshot.docs.map((doc: any) => doc.data());
          const metadata = colleges[0]?.datasetMetadata;
          if (metadata?.datasetId === datasetId) return res.json({ metadata, colleges, source: "Firebase Firestore" });
        }
      } catch (error: any) {
        setFirestoreUnavailable(true);
        console.warn("Dataset Firestore lookup failed; checking the committed dataset.", error?.message);
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
}
