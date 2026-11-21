import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  Shield, 
  RefreshCw,
  Compass
} from 'lucide-react';
import { useAuth, AuthModalTab } from '../../context/AuthContext';
import { ConfirmationResult } from '../../utils/firebase';

export default function AuthModal() {
  const { 
    authModalOpen, 
    closeAuthModal, 
    clearRecaptcha,
    authModalTab, 
    setAuthModalTab,
    authPromptMessage,
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle,
    setupRecaptcha,
    sendOtp,
    verifyOtp,
    resetPassword
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Phone OTP specific states
  const [otpStep, setOtpStep] = useState<'number' | 'otp'>('number');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset internal fields when modal opens or tab changes, and clean up reCAPTCHA
  useEffect(() => {
    if (authModalOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoading(false);
      setOtpStep('number');
      setOtpCode(['', '', '', '', '', '']);
    } else {
      clearRecaptcha();
    }
  }, [authModalOpen, authModalTab, clearRecaptcha]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, [clearRecaptcha]);

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer: any = null;
    if (otpStep === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpStep, resendCountdown]);

  if (!authModalOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(trimmedEmail, password);
      // loginWithEmail closes the modal on success
    } catch (err: any) {
      console.error('[AUTH ERROR]', err);
      if (err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/wrong-password') {
        setErrorMsg('Incorrect password. Please try again or reset your password.');
      } else if (err.code === 'auth/user-not-found') {
        setErrorMsg('No account found with this email. Please check your email or sign up.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else if (err.code === 'auth/user-disabled') {
        setErrorMsg('This user account has been disabled by an administrator.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Network connection failed. Please check your internet connection.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const trimmedPhone = phoneNumber.replace(/\D/g, '');
    if (trimmedPhone && trimmedPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(trimmedEmail, password, trimmedName, trimmedPhone || undefined);
      closeAuthModal();
    } catch (err: any) {
      console.error('[REGISTER ERROR]', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('The email address provided is improperly formatted.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Network connection failed. Please check your internet connection.');
      } else {
        setErrorMsg(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('[GOOGLE SIGN-IN ERROR]', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, silently disregard
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Network connection failed. Please check your connection.');
      } else {
        setErrorMsg(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');

    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length !== 10 && !(cleanedNumber.length === 12 && cleanedNumber.startsWith('91'))) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const fullPhoneNumber = cleanedNumber.startsWith('91') && cleanedNumber.length === 12
      ? `+${cleanedNumber}`
      : `+91${cleanedNumber.slice(-10)}`;

    setIsLoading(true);
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      if (!verifier) {
        throw new Error('reCAPTCHA could not be initialized. Please refresh the page.');
      }

      const result = await sendOtp(fullPhoneNumber, verifier);
      setConfirmationResult(result);
      setOtpStep('otp');
      setResendCountdown(30);
      setSuccessMsg(`6-digit verification code sent to ${fullPhoneNumber}`);
    } catch (err: any) {
      console.error('[PHONE OTP SEND ERROR]', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('SMS unable to be sent until this region is enabled by the app developer (auth/operation-not-allowed). In Firebase Console: Authentication > Sign-in method > Phone > SMS Region Policy > Enable India (+91). Alternatively, sign in using Email or Google.');
      } else if (err.code === 'auth/billing-not-enabled') {
        setErrorMsg('Phone authentication requires Firebase Blaze plan or test numbers. Please use Google or Email sign-in.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setErrorMsg('The mobile number provided is invalid. Please enter a valid 10-digit number.');
      } else if (err.code === 'auth/missing-phone-number') {
        setErrorMsg('Please provide a mobile number.');
      } else if (err.code === 'auth/quota-exceeded') {
        setErrorMsg('Daily SMS quota for this project has been exceeded. Please sign in with Email or Google.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many OTP attempts detected. Please wait a few minutes before trying again.');
      } else if (err.code === 'auth/captcha-check-failed') {
        setErrorMsg('reCAPTCHA verification failed. Please try again or refresh the page.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMsg('Network connection failed. Please check your internet connection.');
      } else {
        setErrorMsg(err.message || 'Failed to send OTP code. Please check the number.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');

    const code = otpCode.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (!confirmationResult) {
      setErrorMsg('Session expired. Please request a new OTP code.');
      setOtpStep('number');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(confirmationResult, code);
    } catch (err: any) {
      console.error('[OTP VERIFY ERROR]', err);
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('Invalid 6-digit OTP code. Please verify the code and try again.');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('The OTP code has expired. Please click Resend Code to receive a new one.');
      } else if (err.code === 'auth/session-expired') {
        setErrorMsg('The SMS verification session has expired. Please request a new code.');
        setOtpStep('number');
      } else {
        setErrorMsg(err.message || 'Invalid or expired OTP code. Please check and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...otpCode];
    newCode[index] = val.slice(-1);
    setOtpCode(newCode);

    // Auto advance to next input
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setSuccessMsg(`Password reset instructions have been dispatched to ${trimmedEmail}. Check your inbox or spam folder.`);
    } catch (err: any) {
      console.error('[PASSWORD RESET ERROR]', err);
      if (err.code === 'auth/user-not-found') {
        setErrorMsg('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many reset requests. Please wait a moment before trying again.');
      } else {
        setErrorMsg(err.message || 'Failed to send reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Invisible container for phone reCAPTCHA */}
      <div id="recaptcha-container"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto"
      >
        {/* Top Header Banner */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-emerald-50/70 to-white border-b border-slate-100 relative">
          <button 
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <img
              src="/logo.png"
              alt="CounselorPro"
              className="w-8 h-8 object-contain rounded-lg drop-shadow-xs"
            />
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Counselor<span className="text-emerald-600">Pro</span>
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-2">
            {authModalTab === 'login' && 'Sign In to Your Account'}
            {authModalTab === 'signup' && 'Create Your Student Account'}
            {authModalTab === 'phone' && 'Phone Number Verification'}
            {authModalTab === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {authModalTab === 'login' && 'Access your saved preferences, mock allotments & admin tools.'}
            {authModalTab === 'signup' && 'Practice option-entry across AP, TS, JoSAA NITs & NEET UG.'}
            {authModalTab === 'phone' && 'Sign in securely with one-time SMS verification.'}
            {authModalTab === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* Tab Switcher (Login / Signup) */}
        {(authModalTab === 'login' || authModalTab === 'signup') && (
          <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
            <button
              type="button"
              onClick={() => { setAuthModalTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                authModalTab === 'login' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                authModalTab === 'signup' 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {/* Compulsory Authentication Prompt Banner */}
          {authPromptMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 shadow-xs">
              <Compass className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-emerald-900">Sign In Required</span>
                <span className="leading-relaxed text-emerald-700">{authPromptMessage}</span>
              </div>
            </div>
          )}

          {/* Status Banners */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: EMAIL SIGN IN */}
          {authModalTab === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthModalTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[42px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {authModalTab === 'signup' && (
            <form onSubmit={handleEmailRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ravi Kumar"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[42px] mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: PHONE OTP LOGIN */}
          {authModalTab === 'phone' && (
            <div>
              {otpStep === 'number' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Mobile Number (+91 India)
                    </label>
                    <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-600">
                      <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-600 bg-slate-100 border-r border-slate-200">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                        className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      We will send a 6-digit verification code via SMS.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phoneNumber.length < 10}
                    className="w-full min-h-[42px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthModalTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
                  >
                    ← Back to Email Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-700">
                        Enter 6-Digit Code
                      </label>
                      <button
                        type="button"
                        onClick={() => { setOtpStep('number'); setOtpCode(['', '', '', '', '', '']); }}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Change number
                      </button>
                    </div>

                    <div className="flex gap-2 justify-center my-3">
                      {otpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { otpInputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-10 sm:w-11 h-12 text-center text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>Didn't receive SMS?</span>
                      {resendCountdown > 0 ? (
                        <span className="text-slate-400">Resend in {resendCountdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleSendPhoneOtp(e)}
                          className="text-emerald-600 hover:underline font-semibold"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.join('').length !== 6}
                    className="w-full min-h-[42px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Proceed</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: FORGOT PASSWORD */}
          {authModalTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[42px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending email...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setAuthModalTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* Social Sign-In Providers (Shown on login and signup tabs) */}
          {(authModalTab === 'login' || authModalTab === 'signup') && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="relative flex justify-center text-xs uppercase mb-3.5">
                <span className="bg-white px-2 text-slate-400 font-medium text-[11px]">
                  Or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full min-h-[38px] py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Phone OTP Sign-In Button */}
                <button
                  type="button"
                  onClick={() => { setAuthModalTab('phone'); setErrorMsg(''); setSuccessMsg(''); }}
                  disabled={isLoading}
                  className="w-full min-h-[38px] py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Phone OTP</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security badge footer */}
        <div className="bg-slate-50/80 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            256-Bit Encrypted & Firebase Protected
          </span>
          <span>CounselorPro Auth</span>
        </div>
      </motion.div>
    </div>
  );
}
