import { 
  db, 
  auth, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc, 
  serverTimestamp 
} from './firebase';
import { WebOption, StudentProfile } from '../types';

export interface PracticeSession {
  id: string;
  ownerUid: string;
  title?: string;
  exam: string;
  stream: string;
  rank: number;
  category: string;
  gender: string;
  region: string;
  choices: WebOption[];
  allottedCollege?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudentDraft {
  id: string;
  ownerUid: string;
  title: string;
  exam: string;
  stream: string;
  step: string;
  profile: any;
  selectedOptions: any[];
  updatedAt?: any;
}

export interface CounsellingPreferences {
  ownerUid: string;
  exam: string;
  preferredDistricts: string[];
  preferredBranches: string[];
  maxFee?: number | null;
  preferredTypes: string[];
  updatedAt?: any;
}

// 1. Save Practice Session
export async function savePracticeSession(
  session: Omit<PracticeSession, 'ownerUid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error('Authentication required to save practice session');

  const sessionId = session.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload: PracticeSession = {
    ...session,
    id: sessionId,
    ownerUid: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (db) {
    try {
      const rootDocRef = doc(db, 'practice_sessions', sessionId);
      await setDoc(rootDocRef, payload);

      // Also persist in the student's isolated subcollection users/{uid}/counsellingSessions
      const userSubDocRef = doc(db, 'users', currentUser.uid, 'counsellingSessions', sessionId);
      await setDoc(userSubDocRef, payload);
    } catch (err) {
      console.warn('[STUDENT DATA] Firestore write fallback to local storage:', err);
    }
  }

  // Local mirror
  try {
    const key = `counselor_sessions_${currentUser.uid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((s: PracticeSession) => s.id !== sessionId);
    localStorage.setItem(key, JSON.stringify([payload, ...filtered]));
  } catch (e) {
    console.warn('Local session caching skipped:', e);
  }

  return sessionId;
}

// 2. Fetch User's Practice Sessions
export async function getStudentPracticeSessions(uid: string): Promise<PracticeSession[]> {
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('Unauthorized: cannot access another student practice sessions');
  }

  if (db) {
    try {
      // 1. Check isolated student subcollection first
      const subSnap = await getDocs(collection(db, 'users', uid, 'counsellingSessions'));
      if (!subSnap.empty) {
        return subSnap.docs.map(doc => doc.data() as PracticeSession);
      }

      // 2. Check root collection
      const q = query(
        collection(db, 'practice_sessions'),
        where('ownerUid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data() as PracticeSession);
      }
    } catch (err) {
      console.warn('[STUDENT DATA] Firestore read fallback to local storage:', err);
    }
  }

  // Fallback to local storage
  try {
    const key = `counselor_sessions_${uid}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

// 3. Save Student Draft
export async function saveStudentDraft(
  draft: Omit<StudentDraft, 'ownerUid' | 'updatedAt'>
): Promise<string> {
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error('Authentication required to save draft');

  const draftId = draft.id || `draft_${currentUser.uid}_${draft.exam.toLowerCase()}`;
  const payload: StudentDraft = {
    ...draft,
    id: draftId,
    ownerUid: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  if (db) {
    try {
      const rootDocRef = doc(db, 'saved_drafts', draftId);
      await setDoc(rootDocRef, payload);

      // Also persist in the student's isolated subcollection users/{uid}/savedChoices
      const userSubDocRef = doc(db, 'users', currentUser.uid, 'savedChoices', draftId);
      await setDoc(userSubDocRef, payload);
    } catch (err) {
      console.warn('[STUDENT DATA] Firestore draft write fallback:', err);
    }
  }

  // Local storage mirror
  try {
    const key = `counselor_draft_${currentUser.uid}`;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}

  return draftId;
}

// 4. Save Counselling Preferences
export async function saveCounsellingPreferences(
  preferences: Omit<CounsellingPreferences, 'ownerUid' | 'updatedAt'>
): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error('Authentication required to save preferences');

  const prefId = `pref_${currentUser.uid}_${preferences.exam.toLowerCase()}`;
  const payload: CounsellingPreferences = {
    ...preferences,
    ownerUid: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  if (db) {
    try {
      const docRef = doc(db, 'counselling_preferences', prefId);
      await setDoc(docRef, payload);
    } catch (err) {
      console.warn('[STUDENT DATA] Preferences write fallback:', err);
    }
  }

  try {
    const key = `counselor_preferences_${currentUser.uid}`;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}
