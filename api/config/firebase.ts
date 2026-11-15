import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  return res.json({
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyAgfXQFSoGjvSxmskHK4tu97Tt0DopngAg",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "counselorpro.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "counselorpro",
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:289926335025:web:a061b899b2a0a68476a310",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "counselorpro.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "289926335025",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-RZME2N1DTD"
  });
}
