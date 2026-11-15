import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  ConfirmationResult,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyAgfXQFSoGjvSxmskHK4tu97Tt0DopngAg",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "counselorpro.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "counselorpro",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "counselorpro.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "289926335025",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:289926335025:web:a061b899b2a0a68476a310",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-RZME2N1DTD"
};

// Singleton initialization with error handling
let app: any = null;
let auth: any = null;
let db: any = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  console.warn('[FIREBASE CLIENT] Client initialization warning:', error);
}

export { 
  app, 
  auth, 
  db, 
  googleProvider,
  // Auth exports
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  // Firestore exports
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  deleteDoc,
  writeBatch
};

export type { User, ConfirmationResult };
