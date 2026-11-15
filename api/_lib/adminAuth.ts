import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { getFirestoreDb } from "./index";

export interface AdminAuthResult {
  authorized: boolean;
  statusCode?: number;
  error?: string;
  decoded?: DecodedIdToken;
}

/**
 * Reusable Authoritative Super Admin Verification Helper for Vercel Serverless Functions.
 * 
 * Verifies:
 * 1. Bearer token presence and structure.
 * 2. Cryptographic signature and expiration of Firebase ID token via Firebase Admin SDK.
 * 3. Configuration of server-side SUPER_ADMIN_UID (fails closed if missing).
 * 4. Dual-condition requirement: decoded.uid === configuredSuperAdminUid AND decoded.role === 'super_admin'.
 * 5. Returns structured authorization result and can directly respond to VercelResponse.
 */
export async function verifySuperAdmin(
  req: VercelRequest,
  res?: VercelResponse
): Promise<AdminAuthResult> {
  // Ensure Firebase Admin is initialized
  getFirestoreDb();

  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    const result: AdminAuthResult = {
      authorized: false,
      statusCode: 401,
      error: "Missing Firebase ID token. Bearer authentication required."
    };
    if (res) res.status(result.statusCode!).json({ error: result.error });
    return result;
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    const result: AdminAuthResult = {
      authorized: false,
      statusCode: 401,
      error: "Empty Firebase ID token provided."
    };
    if (res) res.status(result.statusCode!).json({ error: result.error });
    return result;
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth().verifyIdToken(token, true);
  } catch (tokenErr: any) {
    console.warn("[ADMIN AUTH] ID token cryptographic verification failed:", tokenErr?.message || tokenErr);
    const result: AdminAuthResult = {
      authorized: false,
      statusCode: 401,
      error: "Invalid, expired, or malformed Firebase ID token."
    };
    if (res) res.status(result.statusCode!).json({ error: result.error });
    return result;
  }

  const configuredSuperAdminUid = (process.env.SUPER_ADMIN_UID || "").trim();
  if (!configuredSuperAdminUid) {
    console.error("[SECURITY] SUPER_ADMIN_UID environment variable is not configured on server. Failing closed.");
    const result: AdminAuthResult = {
      authorized: false,
      statusCode: 403,
      error: "Administrative access denied. Server configuration is missing."
    };
    if (res) res.status(result.statusCode!).json({ error: result.error });
    return result;
  }

  const hasSuperAdminClaim = Boolean(decoded && decoded.role === "super_admin");
  const matchesSuperAdminUid = Boolean(decoded?.uid && decoded.uid === configuredSuperAdminUid);

  if (!hasSuperAdminClaim || !matchesSuperAdminUid) {
    console.warn(`[SECURITY] Unauthorized admin request by UID "${decoded?.uid}" (claim: "${decoded?.role}"). Access denied.`);
    const result: AdminAuthResult = {
      authorized: false,
      statusCode: 403,
      error: "Access denied. Only the authorized Super Admin account can manage administrative resources."
    };
    if (res) res.status(result.statusCode!).json({ error: result.error });
    return result;
  }

  return {
    authorized: true,
    decoded
  };
}
