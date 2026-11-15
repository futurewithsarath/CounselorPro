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

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthPromptMessage(null);
  }, []);

  const inFlightSyncRef = useRef<Map<string, Promise<UserProfile>>>(new Map());

  // Synchronize user profile strictly enforcing server-side Custom Claims
  const syncUserProfile = useCallback(async (firebaseUser: User, forceRefresh: boolean = false): Promise<UserProfile> => {
    // Deduplicate simultaneous sync calls for the same user
    const existingSync = inFlightSyncRef.current.get(firebaseUser.uid);
    if (existingSync && !forceRefresh) {
      return existingSync;
    }

    const syncPromise = (async (): Promise<UserProfile> => {
      // 1. Authoritative verification of Custom Claims (use fast cached token unless forced)
      let claimsRole: string | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
        claimsRole = tokenResult.claims.role as string | undefined;
      } catch (e) {
        console.warn('[AUTH] Could not read ID token claims:', e);
      }

      // Role is authoritative from Custom Claims. If claim is super_admin -> super_admin; else strictly student.
      const resolvedRole: UserRole = claimsRole === 'super_admin' ? 'super_admin' : 'student';

      const providerIds = firebaseUser.providerData.map(p => p.providerId);
      if (providerIds.length === 0 && firebaseUser.phoneNumber) {
        providerIds.push('phone');
      }

      const baseProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Student'),
        phoneNumber: firebaseUser.phoneNumber,
        photoURL: firebaseUser.photoURL,
        providerIds,
        role: resolvedRole,
        accountStatus: 'active',
        lastLoginAt: new Date().toISOString()
      };

      // Optimistically update memory & cache immediately for instant UI responsiveness (<5ms)
      setUserProfile(prev => (prev && prev.uid === firebaseUser.uid ? { ...prev, role: resolvedRole } : baseProfile));
      try {
        localStorage.setItem('counselor_cached_profile', JSON.stringify(baseProfile));
      } catch {}

      // Asynchronous, non-blocking background synchronization with Firestore
      // Never blocks auth state resolution, routing decisions, or page transitions (<10ms instant response)
      if (db) {
        (async () => {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: data.displayName || firebaseUser.displayName || baseProfile.displayName,
                phoneNumber: data.phoneNumber || firebaseUser.phoneNumber || null,
                photoURL: data.photoURL || firebaseUser.photoURL || null,
                providerIds: Array.from(new Set([...providerIds, ...(data.providerIds || [])])),
                // Authoritative Custom Claim always takes precedence over doc
                role: resolvedRole,
                accountStatus: (data.accountStatus as any) || 'active',
                createdAt: data.createdAt,
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
              };

              // Update document with latest sign-in timestamp & authoritative role
              try {
                await setDoc(userRef, {
                  ...profile,
                  role: resolvedRole,
                  updatedAt: serverTimestamp(),
                  lastLoginAt: serverTimestamp()
                }, { merge: true });
              } catch (updateErr) {
                console.warn('[AUTH] Profile sync write ignored by rules:', updateErr);
              }

              setUserProfile(profile);
              try {
                localStorage.setItem('counselor_cached_profile', JSON.stringify(profile));
              } catch {}
            } else {
              // Document does not exist yet: create user profile with role strictly defaulted
              const newProfile: UserProfile = {
                ...baseProfile,
                role: resolvedRole,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
              };

              try {
                await setDoc(userRef, newProfile);
              } catch (writeErr) {
                console.warn('[AUTH] Initial profile write to Firestore bypassed:', writeErr);
              }

              setUserProfile(newProfile);
              try {
                localStorage.setItem('counselor_cached_profile', JSON.stringify(newProfile));
              } catch {}
            }
          } catch (err) {
            console.warn('[AUTH] Background Firestore profile sync completed with notice:', err);
          }
        })().catch(() => {});
      }

      return baseProfile;
    })();

    syncPromise.finally(() => {
      inFlightSyncRef.current.delete(firebaseUser.uid);
    });

    inFlightSyncRef.current.set(firebaseUser.uid, syncPromise);
    return syncPromise;
  }, []);

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
      await updateProfile(credential.user, {
        displayName: displayName.trim()
      });
    }

    const token = await credential.user.getIdToken();
    setIdToken(token);

    // Initial student user profile
    if (db) {
      try {
        const userRef = doc(db, 'users', credential.user.uid);
        await setDoc(userRef, {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: displayName.trim(),
          phoneNumber: phoneNumber?.trim() || null,
          photoURL: null,
          providerIds: ['password'],
          role: 'student', // All public registrations are students
          accountStatus: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Initial student doc creation skipped:', e);
      }
    }

    await syncUserProfile(credential.user);
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
      container.innerHTML = ''; // reset
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          console.warn('[AUTH] reCAPTCHA expired, please try again.');
        }
      });
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
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
    setUserProfile(null);
    setIdToken(null);
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
