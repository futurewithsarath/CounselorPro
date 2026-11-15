import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  RefreshCw,
  ArrowLeft,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';

/**
 * Neutral, secure loading screen displayed during authentication initialization
 * and cryptographic token verification. NEVER mounts administrative controls or fetches data.
 */
export function AdminLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-8 text-center shadow-2xl space-y-5">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-30" />
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-emerald-500/40 flex items-center justify-center shadow-lg">
            <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Verifying Security Credentials
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Validating Super Admin authorization clearance...
          </p>
        </div>

        <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-2/3 animate-pulse rounded-full" />
        </div>

        <p className="text-[11px] text-slate-500">
          CounselorPro Central Security & Clearance Engine
        </p>
      </div>
    </div>
  );
}

/**
 * Access Denied screen displayed when an authenticated non-admin (Student) attempts
 * to access any administrative route or resource.
 */
export function AdminAccessDeniedScreen({
  email,
  displayName,
  onReturnHome,
  onSignOut
}: {
  email?: string | null;
  displayName?: string | null;
  onReturnHome: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-red-200/80 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
            <span>403 Forbidden · Access Denied</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Administrative Access Restricted
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your account (<strong className="text-slate-800">{email || displayName || 'Student'}</strong>) is registered with standard <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold font-mono text-[11px]">Student</span> privileges.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            The CounselorPro Central Management Console, college master datasets, cutoff matrices, and user directory are restricted exclusively to the authorized Super Admin account.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={onReturnHome}
            className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Counseling Portal</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full min-h-[40px] py-2 px-4 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50/50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Fail-Closed Administrative Route Guard.
 * Strictly verifies authenticated user, custom claim role === 'super_admin',
 * and UID matching the configured Super Admin UID before permitting rendering.
 */
export default function AdminRouteGuard() {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    isSuperAdmin,
    isLoading: authLoading,
    openAuthModal,
    logout
  } = useAuth();

  // Instant Redirection Effect for non-super_admin accounts (Zero-Lag Transition):
  // Cases B & C: Immediately redirects non-super_admin and unauthenticated visitors to homepage
  // Eliminates UI lag, unnecessary loading screens, and unauthorized route access.
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // CASE C: Unauthenticated visitor -> immediate redirect to public homepage
        navigate('/', { replace: true });
      } else if (!isSuperAdmin || userProfile?.role !== 'super_admin') {
        // CASE B: Normal student -> immediate redirect to student portal
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, user, isSuperAdmin, userProfile?.role, navigate]);

  // 1. Loading State: Never render AdminDashboard while authenticating
  if (authLoading) {
    return <AdminLoadingScreen />;
  }

  // 2. Unauthenticated: Prompt login
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Administrator Access Required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              The CounselorPro Central Management Console is strictly restricted to the authorized Super Admin account. Please sign in to verify your security clearance.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => openAuthModal('login', 'Please sign in with your Super Admin credentials.')}
              className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In as Super Admin</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full min-h-[42px] py-2 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Student Counseling Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated as Student or unauthorized: Strict Access Denied
  if (!isSuperAdmin || userProfile?.role !== 'super_admin') {
    return (
      <AdminAccessDeniedScreen
        email={user.email}
        displayName={userProfile?.displayName}
        onReturnHome={() => navigate('/')}
        onSignOut={async () => {
          await logout();
          navigate('/');
        }}
      />
    );
  }

  // 4. Authorized Super Admin ONLY: Mount and render AdminDashboard
  return <AdminDashboard onClose={() => navigate('/')} />;
}
