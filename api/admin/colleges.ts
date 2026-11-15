import { VercelRequest, VercelResponse } from "@vercel/node";
import { getFirestoreDb } from "../_lib/index";
import { verifySuperAdmin } from "../_lib/adminAuth";
import {
  addOrUpdateDynamicCollege,
  deleteDynamicCollege,
  readDynamicStore
} from "../_lib/dynamicCollegesStore";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enforce authoritative Super Admin gate on all methods
  const authResult = await verifySuperAdmin(req, res);
  if (!authResult.authorized) return;

  const method = req.method;
  const decodedAdmin = authResult.decoded;

  if (method === "GET") {
    try {
      const db = getFirestoreDb();
      if (db) {
        try {
          const [customSnap, tombstoneSnap] = await Promise.all([
            db.collection("colleges").where("isCustom", "==", true).limit(500).get().catch(() => null),
            db.collection("college_tombstones").limit(1000).get().catch(() => null)
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
        } catch (dbErr) {
          console.warn("[ADMIN COLLEGES GET] Firestore query fallback to local store:", dbErr);
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
      return res.status(500).json({ error: "Failed to read colleges list." });
    }
  }

  if (method === "POST") {
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

      const db = getFirestoreDb();

      // Check for duplicate ID in Firestore
      if (db) {
        try {
          const docRef = db.collection("colleges").doc(`${datasetId}__${collegeId}`);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            return res.status(409).json({ error: `A college record with ID "${collegeId}" already exists in ${datasetId}.` });
          }
          const duplicateQuery = await db.collection("colleges").where("id", "==", collegeId).limit(1).get();
          if (!duplicateQuery.empty) {
            return res.status(409).json({ error: `A college record with ID "${collegeId}" already exists.` });
          }
        } catch (checkErr: any) {
          console.warn("[ADMIN ADD COLLEGE] Firestore duplicate check error:", checkErr?.message);
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

      // 1. Authoritative Persistence: Write to Firestore
      if (db) {
        try {
          const docId = `${datasetId}__${collegeId}`;
          await db.collection("colleges").doc(docId).set({
            ...collegeRecord,
            datasetId,
            datasetMetadata: {
              datasetId,
              exam: validatedExam,
              stream: validatedStream,
              year: validatedYear
            }
          });
          // Remove from persistent tombstones if it was previously deleted
          await db.collection("college_tombstones").doc(collegeId).delete().catch(() => {});
        } catch (dbErr: any) {
          console.error("[ADMIN ADD COLLEGE] Firestore doc write failed:", dbErr);
          return res.status(500).json({ error: `Failed to persist college to database: ${dbErr?.message || "Internal database error"}` });
        }
      }

      // 2. Safe local store update for offline development fallback
      addOrUpdateDynamicCollege(collegeRecord);

      return res.status(201).json({
        success: true,
        college: collegeRecord,
        message: `College "${collegeRecord.name}" (${collegeRecord.code}) successfully created and synchronized in Firestore.`
      });
    } catch (err: any) {
      console.error("[ADMIN ADD COLLEGE ERROR]", err);
      return res.status(500).json({ error: "Failed to create college record." });
    }
  }

  if (method === "DELETE") {
    try {
      const queryId = req.query.id as string | undefined;
      const bodyId = (req.body?.id || req.body?.collegeId) as string | undefined;
      const id = queryId || bodyId;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "College ID is required for deletion." });
      }

      const datasetId = (req.query.datasetId as string | undefined) || req.body?.datasetId;
      const db = getFirestoreDb();

      // 1. Authoritative Persistence: Delete from Firestore & create persistent tombstone
      if (db) {
        try {
          if (datasetId) {
            await db.collection("colleges").doc(`${datasetId}__${id}`).delete().catch(() => {});
          }
          const snapshot = await db.collection("colleges").where("id", "==", id).get();
          if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
          }

          // Persistent Deletion Tombstone in Firestore
          await db.collection("college_tombstones").doc(id).set({
            id,
            datasetId: datasetId || "ALL",
            deletedAt: new Date().toISOString(),
            deletedByUid: decodedAdmin?.uid || "SUPER_ADMIN"
          });
        } catch (dbErr: any) {
          console.error("[ADMIN DELETE COLLEGE] Firestore deletion failed:", dbErr);
          return res.status(500).json({ error: `Failed to delete college from database: ${dbErr?.message || "Internal database error"}` });
        }
      }

      // 2. Safe local store update for offline development fallback
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
  }

  if (method === "PUT") {
    try {
      const id = (req.query.id as string) || req.body?.id;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "College ID is required for update." });
      }

      const datasetId = (req.query.datasetId as string | undefined) || req.body?.datasetId;
      const updates = { ...(req.body || {}) };
      delete updates.id; // Preserve immutable ID
      updates.updatedAt = new Date().toISOString();

      const db = getFirestoreDb();

      // 1. Authoritative Persistence: Update in Firestore
      if (db) {
        try {
          const snapshot = await db.collection("colleges").where("id", "==", id).get();
          if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach((doc: any) => batch.update(doc.ref, updates));
            await batch.commit();
          } else if (datasetId) {
            const directDoc = await db.collection("colleges").doc(`${datasetId}__${id}`).get();
            if (directDoc.exists) {
              await directDoc.ref.update(updates);
            } else {
              return res.status(404).json({ error: `College record "${id}" not found to update.` });
            }
          } else {
            return res.status(404).json({ error: `College record "${id}" not found to update.` });
          }
        } catch (dbErr: any) {
          console.error("[ADMIN UPDATE COLLEGE] Firestore update failed:", dbErr);
          return res.status(500).json({ error: `Failed to update college in database: ${dbErr?.message || "Internal database error"}` });
        }
      }

      // 2. Safe local store update for offline development fallback
      addOrUpdateDynamicCollege({ id, ...updates });

      return res.status(200).json({
        success: true,
        id,
        message: `College record "${id}" updated successfully in Firestore.`
      });
    } catch (err: any) {
      console.error("[ADMIN UPDATE COLLEGE ERROR]", err);
      return res.status(500).json({ error: "Failed to update college record." });
    }
  }

  return res.status(405).json({ error: `Method ${method} not allowed.` });
}
