import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  auth,
  db,
  googleProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPopup,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  User,
  ConfirmationResult
} from '../utils/firebase';

export type UserRole = 'super_admin' | 'student';
export type AuthStatus = 'INITIALIZING' | 'UNAUTHENTICATED' | 'STUDENT' | 'SUPER_ADMIN';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerIds: string[];
  role: UserRole;
  accountStatus: 'active' | 'suspended';
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export type AuthModalTab = 'login' | 'signup' | 'phone' | 'forgot';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  idToken: string | null;
  isLoading: boolean;
  isProfileReady: boolean;
  profileError: string | null;
  retryProfileSync: () => Promise<UserProfile | null>;
  authStatus: AuthStatus;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authModalOpen: boolean;
  authModalTab: AuthModalTab;
  authPromptMessage: string | null;
  intendedDestination: any | null;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: AuthModalTab) => void;
  setAuthPromptMessage: (msg: string | null) => void;
  setIntendedDestination: (dest: any | null) => void;
  clearIntendedDestination: () => void;
  openAuthModal: (tab?: AuthModalTab, promptMessage?: string, destination?: any) => void;
  closeAuthModal: () => void;
  clearRecaptcha: () => void;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (email: string, password: string, displayName: string, phoneNumber?: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  linkGoogleAccount: () => Promise<User>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier | null;
  sendOtp: (phoneNumber: string, verifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyOtp: (confirmationResult: ConfirmationResult, code: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('counselor_cached_profile');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Fail-closed security: Never initialize super_admin from localStorage.
      // Super Admin privilege is strictly granted only after live token verification.
      return { ...parsed, role: 'student' as UserRole };
    } catch {
      return null;
    }
  });
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileReady, setIsProfileReady] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [intendedDestination, setIntendedDestinationState] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('counselor_intended_destination');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setIntendedDestination = useCallback((dest: any | null) => {
    setIntendedDestinationState(dest);
    if (dest) {
      try {
        localStorage.setItem('counselor_intended_destination', JSON.stringify(dest));
      } catch { }
    } else {
      localStorage.removeItem('counselor_intended_destination');
    }
  }, []);

  const clearIntendedDestination = useCallback(() => {
    setIntendedDestinationState(null);
    localStorage.removeItem('counselor_intended_destination');
  }, []);

  const openAuthModal = useCallback((tab: AuthModalTab = 'login', promptMessage: string = '', destination: any = null) => {
    setAuthModalTab(tab);
    setAuthPromptMessage(promptMessage || null);
    if (destination) {
      setIntendedDestination(destination);
    }
    setAuthModalOpen(true);
  }, [setIntendedDestination]);

  const inFlightSyncRef = useRef<Map<string, Promise<UserProfile>>>(new Map());
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const clearRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        console.warn('[AUTH] Error during recaptcha clear:', e);
      }
      recaptchaVerifierRef.current = null;
    }
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthPromptMessage(null);
    clearRecaptcha();
  }, [clearRecaptcha]);
  // Idempotent and recoverable student profile initialization with exponential backoff
  const initializeFirestoreProfile = useCallback(async (
    firebaseUser: User,
    options: { displayName?: string; phoneNumber?: string; maxRetries?: number; timeoutMs?: number } = {}
  ): Promise<UserProfile> => {
    if (!db) {
      throw new Error('Firestore is not initialized.');
    }

    const { displayName, phoneNumber, maxRetries = 2, timeoutMs = 3500 } = options;
    const userRef = doc(db, 'users', firebaseUser.uid);

    let claimsRole: string | undefined;
    try {
      const tokenResult = await firebaseUser.getIdTokenResult();
      claimsRole = tokenResult.claims.role as string | undefined;
    } catch (e) {
      console.warn('[AUTH] Could not read ID token claims in init:', e);
    }
    const resolvedRole: UserRole = claimsRole === 'super_admin' ? 'super_admin' : 'student';

    const providerIds = firebaseUser.providerData.map(p => p.providerId);
    if (providerIds.length === 0 && firebaseUser.phoneNumber) {
      providerIds.push('phone');
    }

    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const profileOp = (async (): Promise<UserProfile> => {
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: data.displayName || displayName || firebaseUser.displayName || 'Student',
              phoneNumber: data.phoneNumber || phoneNumber || firebaseUser.phoneNumber || null,
              photoURL: data.photoURL || firebaseUser.photoURL || null,
              providerIds: Array.from(new Set([...providerIds, ...(data.providerIds || [])])),
              role: resolvedRole,
              accountStatus: (data.accountStatus as any) || 'active',
              createdAt: data.createdAt,
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            };

            await setDoc(userRef, {
              ...profile,
              role: resolvedRole,
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            }, { merge: true });

            return profile;
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: displayName?.trim() || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
              phoneNumber: phoneNumber?.trim() || firebaseUser.phoneNumber || null,
              photoURL: firebaseUser.photoURL || null,
              providerIds: providerIds.length > 0 ? providerIds : ['password'],
              role: resolvedRole,
              accountStatus: 'active',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            };

            await setDoc(userRef, newProfile);
            return newProfile;
          }
        })();

        const result = await Promise.race([
          profileOp,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Firestore profile operation timed out after ${timeoutMs}ms (attempt ${attempt}/${maxRetries + 1})`)), timeoutMs)
          )
        ]);

        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AUTH] Profile initialization attempt ${attempt} failed:`, err.message || err);
        if (attempt <= maxRetries) {
          await new Promise(res => setTimeout(res, attempt * 500));
        }
      }
    }

    throw new Error(`Profile initialization failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Database unavailable'}`);
  }, []);

  const syncUserProfile = useCallback(async (firebaseUser: User, forceRefresh: boolean = false): Promise<UserProfile> => {
    // Deduplicate simultaneous sync calls for the same user
    const existingSync = inFlightSyncRef.current.get(firebaseUser.uid);
    if (existingSync && !forceRefresh) {
      return existingSync;
    }

    const syncPromise = (async (): Promise<UserProfile> => {
      let claimsRole: string | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
        claimsRole = tokenResult.claims.role as string | undefined;
      } catch (e) {
        console.warn('[AUTH] Could not read ID token claims:', e);
      }
      const resolvedRole: UserRole = claimsRole === 'super_admin' ? 'super_admin' : 'student';

      if (db) {
        try {
          const profile = await initializeFirestoreProfile(firebaseUser, {
            maxRetries: 2,
            timeoutMs: 3500
          });
          setUserProfile(profile);
          setIsProfileReady(true);
          setProfileError(null);
          try {
            localStorage.setItem('counselor_cached_profile', JSON.stringify(profile));
          } catch {}
          return profile;
        } catch (syncErr: any) {
          console.warn('[AUTH] Firestore profile sync failed:', syncErr.message || syncErr);
          setIsProfileReady(false);
          setProfileError(syncErr.message || 'Unable to sync profile from database.');

          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Student',
            phoneNumber: firebaseUser.phoneNumber,
            photoURL: firebaseUser.photoURL,
            providerIds: firebaseUser.providerData.map(p => p.providerId),
            role: resolvedRole,
            accountStatus: 'active',
            lastLoginAt: new Date().toISOString()
          };
          setUserProfile(fallbackProfile);
          return fallbackProfile;
        }
      } else {
        const localProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Student',
          phoneNumber: firebaseUser.phoneNumber,
          photoURL: firebaseUser.photoURL,
          providerIds: firebaseUser.providerData.map(p => p.providerId),
          role: resolvedRole,
          accountStatus: 'active',
          lastLoginAt: new Date().toISOString()
        };
        setUserProfile(localProfile);
        setIsProfileReady(true);
        return localProfile;
      }
    })();

    syncPromise.finally(() => {
      inFlightSyncRef.current.delete(firebaseUser.uid);
    });

    inFlightSyncRef.current.set(firebaseUser.uid, syncPromise);
    return syncPromise;
  }, [initializeFirestoreProfile]);

  const retryProfileSync = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    setProfileError(null);
    return await syncUserProfile(user, true);
  }, [user, syncUserProfile]);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            setIdToken(token);
          } catch {
            setIdToken(null);
          }
          await syncUserProfile(currentUser);
        } else {
          setUserProfile(null);
          setIdToken(null);
          setIsProfileReady(true);
          setProfileError(null);
          localStorage.removeItem('counselor_cached_profile');
        }
      } catch (err) {
        console.warn('[AUTH] Error during onIdTokenChanged transition:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [syncUserProfile]);

  const loginWithEmail = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    closeAuthModal();
    const token = await credential.user.getIdToken();
    setIdToken(token);
    await syncUserProfile(credential.user);
    return credential.user;
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string,
    phoneNumber?: string
  ): Promise<User> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

    if (displayName.trim()) {
      try {
        await updateProfile(credential.user, {
          displayName: displayName.trim()
        });
      } catch (profileErr) {
        console.warn('[AUTH] Could not update profile displayName:', profileErr);
      }
    }

    const token = await credential.user.getIdToken();
    setIdToken(token);
    setUser(credential.user);

    // Idempotent, recoverable student profile creation with retries
    if (db) {
      try {
        const profile = await initializeFirestoreProfile(credential.user, {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber?.trim(),
          maxRetries: 1,
          timeoutMs: 2500
        });
        setUserProfile(profile);
        setIsProfileReady(true);
        setProfileError(null);
        try {
          localStorage.setItem('counselor_cached_profile', JSON.stringify(profile));
        } catch {}
      } catch (initErr: any) {
        console.warn('[AUTH] Profile creation notice during registration:', initErr);
        setIsProfileReady(false);
        setProfileError(`Profile initialization failed: ${initErr.message || 'timed out'}`);

        const fallbackProfile: UserProfile = {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: displayName.trim() || credential.user.email?.split('@')[0] || 'Student',
          phoneNumber: phoneNumber?.trim() || null,
          photoURL: null,
          providerIds: ['password'],
          role: 'student',
          accountStatus: 'active',
          lastLoginAt: new Date().toISOString()
        };
        setUserProfile(fallbackProfile);
      }
    } else {
      setIsProfileReady(true);
    }

    closeAuthModal();
    return credential.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    if (!auth || !googleProvider) throw new Error('Firebase Google Auth is not initialized');
    const credential = await signInWithPopup(auth, googleProvider);
    closeAuthModal();
    const token = await credential.user.getIdToken();
    setIdToken(token);
    await syncUserProfile(credential.user);
    return credential.user;
  };

  // Provider Linking
  const linkGoogleAccount = async (): Promise<User> => {
    if (!auth?.currentUser || !googleProvider) throw new Error('User not signed in or Google provider unavailable');
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  };

  const setupRecaptcha = (containerId: string): RecaptchaVerifier | null => {
    if (!auth) return null;
    try {
      const container = document.getElementById(containerId);
      if (!container) return null;

      // Safely clear any previously initialized reCAPTCHA widget instance
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (clearErr) {
          console.warn('[AUTH] Previous RecaptchaVerifier clear notice:', clearErr);
        }
        recaptchaVerifierRef.current = null;
      }

      container.innerHTML = ''; // reset container DOM

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          console.warn('[AUTH] reCAPTCHA expired, please request code again.');
        }
      });

      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (e) {
      console.error('[AUTH] reCAPTCHA initialization failed:', e);
      return null;
    }
  };

  const sendOtp = async (phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  };

  const verifyOtp = async (confirmationResult: ConfirmationResult, code: string): Promise<User> => {
    const credential = await confirmationResult.confirm(code);
    closeAuthModal();
    const token = await credential.user.getIdToken();
    setIdToken(token);
    await syncUserProfile(credential.user);
    return credential.user;
  };

  // Authoritative role evaluation: Single Super Admin policy (Matching Custom Claim)
  const isSuperAdmin = useMemo(() => {
    if (isLoading || !user) return false;
    // Client role is authoritative from cryptographically signed ID Token Custom Claims
    const matchesTargetUid = Boolean(userProfile?.role === 'super_admin');
    return matchesTargetUid;
  }, [user, userProfile?.role, isLoading]);

  // Explicit, fail-closed authorization status
  const authStatus = useMemo<AuthStatus>(() => {
    if (isLoading) return 'INITIALIZING';
    if (!user) return 'UNAUTHENTICATED';
    if (isSuperAdmin) return 'SUPER_ADMIN';
    return 'STUDENT';
  }, [isLoading, user, isSuperAdmin]);

  const resetPassword = async (email: string): Promise<void> => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async (): Promise<void> => {
    clearRecaptcha();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setUserProfile(null);
    setIdToken(null);
    setIsProfileReady(true);
    setProfileError(null);
    localStorage.removeItem('counselor_cached_profile');
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return await syncUserProfile(user, true);
  };

  const isAdmin = useMemo(() => {
    return isSuperAdmin;
  }, [isSuperAdmin]);

  const value = {
    user,
    userProfile,
    idToken,
    isLoading,
    isProfileReady,
    profileError,
    retryProfileSync,
    authStatus,
    isAdmin,
    isSuperAdmin,
    authModalOpen,
    authModalTab,
    authPromptMessage,
    intendedDestination,
    setAuthModalOpen,
    setAuthModalTab,
    setAuthPromptMessage,
    setIntendedDestination,
    clearIntendedDestination,
    openAuthModal,
    closeAuthModal,
    clearRecaptcha,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    linkGoogleAccount,
    setupRecaptcha,
    sendOtp,
    verifyOtp,
    resetPassword,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
