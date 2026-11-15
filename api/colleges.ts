import { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "node:fs";
import path from "node:path";
import { getFirestoreDb, firestoreUnavailable, setFirestoreUnavailable } from "./_lib/index";
import { applyDynamicModifications } from "./_lib/dynamicCollegesStore";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed. Use GET." });
  const datasetId = String(req.query.datasetId || "");
  if (
    !/^(AP_EAPCET|TS_EAMCET)_(MPC|BIPC)_\d{4}$/.test(datasetId) && 
    !/^NEET_UG_\d{4}(_\d{4})?(_VERIFIED)?$/.test(datasetId) &&
    !/^NEET_UG_\d{4}_ROUND\d+_MCC$/.test(datasetId) &&
    !/^NMC_MBBS_\d{4}_\d{4}$/.test(datasetId) &&
    !/^JEE_MAIN(_\d{4})?$/.test(datasetId)
  ) {
    return res.status(400).json({ error: "Provide a valid datasetId (e.g. AP_EAPCET_MPC_2025, NEET_UG_2024_2025, NEET_UG_2026_ROUND1_MCC, NMC_MBBS_2025_2026, or JEE_MAIN_2025)." });
  }

  try {
    const db = getFirestoreDb();
    const firestoreTombstones = new Set<string>();
    let firestoreRecords: any[] = [];
    let isFullFirestoreDataset = false;
    let firestoreMetadata: any = null;

    if (db && !firestoreUnavailable) {
      try {
        // 1. Fetch persistent deletion tombstones from Firestore
        const tombstoneSnap = await db.collection("college_tombstones")
          .where("datasetId", "in", [datasetId, "ALL"])
          .get()
          .catch(() => ({ docs: [] } as any));
        
        tombstoneSnap.docs.forEach((doc: any) => {
          firestoreTombstones.add(doc.id);
          const data = doc.data();
          if (data?.id) firestoreTombstones.add(data.id);
        });

        // 2. Fetch colleges matching datasetId from Firestore
        const snapshot = await db.collection("colleges").where("datasetId", "==", datasetId).limit(5000).get();
        if (!snapshot.empty) {
          firestoreRecords = snapshot.docs.map((doc: any) => doc.data());
          firestoreMetadata = firestoreRecords[0]?.datasetMetadata;
          if (firestoreRecords.length >= 100 && firestoreMetadata?.datasetId === datasetId) {
            isFullFirestoreDataset = true;
          }
        }
      } catch (error: any) {
        setFirestoreUnavailable(true);
        console.warn("Dataset Firestore lookup failed; checking committed dataset.", error?.message);
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
}
