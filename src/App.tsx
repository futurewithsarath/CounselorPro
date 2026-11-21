import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ExamSelector from './components/ExamSelector';
import ProfileForm from './components/ProfileForm';
import MotionButton from './components/ui/MotionButton';

const OptionEntry = React.lazy(() => import('./components/OptionEntry'));
const ChoiceRefinement = React.lazy(() => import('./components/ChoiceRefinement'));
const FinalReview = React.lazy(() => import('./components/FinalReview'));
const ComingSoon = React.lazy(() => import('./components/ComingSoon'));
const JeeProfileForm = React.lazy(() => import('./components/jee/JeeProfileForm'));
const JeeOptionEntry = React.lazy(() => import('./components/jee/JeeOptionEntry'));
const JeeReviewLock = React.lazy(() => import('./components/jee/JeeReviewLock'));
const JeeLearningCentre = React.lazy(() => import('./components/jee/JeeLearningCentre'));
const NeetProfileForm = React.lazy(() => import('./components/neet/NeetProfileForm'));
const NeetOptionEntry = React.lazy(() => import('./components/neet/NeetOptionEntry'));
const NeetReviewLock = React.lazy(() => import('./components/neet/NeetReviewLock'));
const NeetLearningCentre = React.lazy(() => import('./components/neet/NeetLearningCentre'));
const SuccessScreen = React.lazy(() => import('./components/SuccessScreen'));
const AdminRouteGuard = React.lazy(() => import('./components/admin/AdminRouteGuard'));
const SharedResultView = React.lazy(() => import('./components/SharedResultView'));
import AuthModal from './components/auth/AuthModal';
import UserNav from './components/auth/UserNav';
import { useAuth } from './context/AuthContext';

import { StudentProfile, WebOption, ExamType, JeeStudentProfile, JeePracticeChoice, NeetStudentProfile, NeetChoice } from './types';
import { Compass, Sparkles, CheckCircle, GraduationCap, Database, Save, RefreshCw, BookOpen, Stethoscope, AlertCircle } from 'lucide-react';
import { loadRealCollegesForExam, COLLEGES_SOURCE, getDefaultDatasetYear } from './data/colleges';

type StepType = 'LANDING' | 'SELECT_EXAM' | 'ENTER_DETAILS' | 'ENTRY_WORKFLOW' | 'REFINEMENT' | 'FINAL_REVIEW' | 'SUCCESS' | 'COMING_SOON';

function StepLoadingFallback() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center py-24 px-4 min-h-[50vh]">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-3 shadow-xs">
        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-700 tracking-tight">Loading Counselling Module...</p>
      <p className="text-xs text-slate-400 mt-1 font-mono">Preparing verified colleges & cutoffs</p>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const {
    user,
    userProfile,
    isSuperAdmin,
    isLoading: authLoading,
    isProfileReady,
    profileError,
    retryProfileSync,
    openAuthModal,
    intendedDestination,
    clearIntendedDestination
  } = useAuth();

  // Strict Administrative Route Detection (matches /admin, /admin/, and all nested subpaths)
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

  // Check for shared result URL query parameter (?share=...)
  const searchParams = new URLSearchParams(location.search);
  const shareParam = searchParams.get('share');
  const sharedData = useMemo(() => {
    if (!shareParam) return null;
    try {
      const decoded = atob(decodeURIComponent(shareParam));
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Failed to parse share data:', e);
      return null;
    }
  }, [shareParam]);

  // Dynamic DB Status state
  const [dbStatus, setDbStatus] = useState<{ loaded: boolean; count: number; source: string }>({
    loaded: false,
    count: 0,
    source: 'Initializing...'
  });

  const [loadingColleges, setLoadingColleges] = useState(false);

  // 1. Wizard & Data Persistence state loaded from localStorage
  const [step, setStep] = useState<StepType>(() => {
    const saved = localStorage.getItem('counselor_step');
    if (saved === 'REFINEMENT') return 'ENTRY_WORKFLOW';
    return (saved as StepType) || 'LANDING';
  });

  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('counselor_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.stream) parsed.stream = 'MPC';
        delete parsed.hallTicket;
        return parsed;
      } catch (e) {
        // Fallback below
      }
    }
    return {
      exam: null,
      stream: 'MPC',
      rank: 15000,
      gender: 'Male',
      category: 'OC',
      region: 'OU',
    };
  });

  const [selectedOptions, setSelectedOptions] = useState<WebOption[]>(() => {
    const saved = localStorage.getItem('counselor_selectedOptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [];
  });

  // JEE Main State Persistence
  const [jeeProfile, setJeeProfile] = useState<JeeStudentProfile>(() => {
    const saved = localStorage.getItem('counselor_jee_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return {
      admissionYear: 2025,
      paper: 'Paper 1 (B.E./B.Tech)',
      practiceMode: 'GUIDED',
      stateOfEligibility: 'Andhra Pradesh',
      crlRank: null,
      category: 'OPEN',
      categoryRank: null,
      gender: 'Male',
      isPwd: false
    };
  });

  const [jeeChoices, setJeeChoices] = useState<JeePracticeChoice[]>(() => {
    const saved = localStorage.getItem('counselor_jee_choices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [];
  });

  const [isJeeLearningOpen, setIsJeeLearningOpen] = useState(false);

  // NEET UG State Persistence
  const [neetProfile, setNeetProfile] = useState<NeetStudentProfile>(() => {
    const saved = localStorage.getItem('counselor_neet_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return {
      admissionYear: 2024,
      allIndiaRank: 18500,
      neetScore: 615,
      category: 'UR',
      gender: 'Male',
      isPwd: false,
      domicileState: 'Andhra Pradesh',
      localArea: 'AU',
      minority: 'NONE',
      pcbMarksPercentage: 75,
      activeAuthority: 'ALL',
      selectedCourses: ['MBBS', 'BDS', 'BAMS']
    };
  });

  const [neetChoices, setNeetChoices] = useState<NeetChoice[]>(() => {
    const saved = localStorage.getItem('counselor_neet_choices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    return [];
  });

  const [isNeetLearningOpen, setIsNeetLearningOpen] = useState(false);

  // Ensure we are strictly in light mode by removing the dark class and cleaning up theme storage
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('counselor_theme');
  }, []);

  // Fetch the real colleges database dynamically ONLY when the user selects their exam + stream (Requirement 4 & 5)
  useEffect(() => {
    if (!profile.exam) {
      setDbStatus({
        loaded: false,
        count: 0,
        source: 'Select an exam first'
      });
      return;
    }

    if (profile.exam === 'JEE_MAIN') {
      setDbStatus({
        loaded: true,
        count: 31,
        source: '31 NITs (Council of NITSER & JoSAA)'
      });
      return;
    }

    if (profile.exam === 'NEET_UG') {
      import('./data/neetCatalog').then(m => {
        setDbStatus({
          loaded: true,
          count: m.NEET_COLLEGES_CATALOG.length,
          source: `${m.NEET_COLLEGES_CATALOG.length} Verified NEET Medical & AYUSH Records (MCC, YSRUHS, KNRUHS, AACCC)`
        });
      });
      return;
    }

    let active = true;
    setLoadingColleges(true);
    loadRealCollegesForExam(profile.exam, profile.stream || 'MPC', getDefaultDatasetYear(profile.exam, profile.stream || 'MPC'))
      .then(count => {
        if (!active) return;
        if (count > 0) {
          setDbStatus({
            loaded: true,
            count,
            source: COLLEGES_SOURCE
          });
        } else {
          setDbStatus({
            loaded: false,
            count: 0,
            source: COLLEGES_SOURCE || 'Fallback'
          });
        }
      })
      .catch(err => {
        if (!active) return;
        console.error('Error fetching colleges database:', err);
        setDbStatus({
          loaded: false,
          count: 0,
          source: 'Error loading database'
        });
      })
      .finally(() => {
        if (active) setLoadingColleges(false);
      });
    return () => { active = false; };
  }, [profile.exam, profile.stream]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    return () => window.cancelAnimationFrame(frame);
  }, [step, isAdminRoute]);

  // CRITICAL SECURITY & PRODUCT GUARD: Login & Profile Readiness Required for Counselling Practice
  useEffect(() => {
    const practiceSteps: StepType[] = ['ENTER_DETAILS', 'ENTRY_WORKFLOW', 'FINAL_REVIEW', 'SUCCESS'];
    if (practiceSteps.includes(step) && (!user || !isProfileReady) && !authLoading) {
      if (!user) {
        openAuthModal('login', 'Please log in to start your counselling practice.', {
          step,
          exam: profile.exam,
          stream: profile.stream
        });
      }
      setStep('SELECT_EXAM');
    }
  }, [step, user, isProfileReady, authLoading, profile.exam, profile.stream, openAuthModal]);

  // RESTORE INTENDED MODULE & RESUME PRACTICE AFTER LOGIN
  useEffect(() => {
    if (user && intendedDestination) {
      if (intendedDestination.exam) {
        handleSelectExam(intendedDestination.exam);
      }
      if (intendedDestination.stream) {
        setProfile(p => ({ ...p, stream: intendedDestination.stream }));
      }
      if (intendedDestination.step) {
        setStep(intendedDestination.step as StepType);
      } else {
        setStep('ENTER_DETAILS');
      }
      clearIntendedDestination();
    }
  }, [user, intendedDestination, clearIntendedDestination]);

  // Form State and Wizard Step change sync
  useEffect(() => {
    localStorage.setItem('counselor_step', step);
  }, [step]);

  useEffect(() => {
    localStorage.setItem('counselor_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('counselor_selectedOptions', JSON.stringify(selectedOptions));
  }, [selectedOptions]);

  useEffect(() => {
    localStorage.setItem('counselor_jee_profile', JSON.stringify(jeeProfile));
  }, [jeeProfile]);

  useEffect(() => {
    localStorage.setItem('counselor_jee_choices', JSON.stringify(jeeChoices));
  }, [jeeChoices]);

  useEffect(() => {
    localStorage.setItem('counselor_neet_profile', JSON.stringify(neetProfile));
  }, [neetProfile]);

  useEffect(() => {
    localStorage.setItem('counselor_neet_choices', JSON.stringify(neetChoices));
  }, [neetChoices]);

  // Save Draft state and handler
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSaveDraft = useCallback(() => {
    localStorage.setItem('counselor_step', step);
    localStorage.setItem('counselor_profile', JSON.stringify(profile));
    localStorage.setItem('counselor_selectedOptions', JSON.stringify(selectedOptions));
    localStorage.setItem('counselor_jee_profile', JSON.stringify(jeeProfile));
    localStorage.setItem('counselor_jee_choices', JSON.stringify(jeeChoices));
    localStorage.setItem('counselor_neet_profile', JSON.stringify(neetProfile));
    localStorage.setItem('counselor_neet_choices', JSON.stringify(neetChoices));
    setShowSaveToast(true);
  }, [step, profile, selectedOptions, jeeProfile, jeeChoices, neetProfile, neetChoices]);

  useEffect(() => {
    if (showSaveToast) {
      const timer = setTimeout(() => {
        setShowSaveToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSaveToast]);

  // Swipe navigation gesture handlers for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSwipeNext = () => {
    if (step === 'SELECT_EXAM' && profile.exam) {
      setStep('ENTER_DETAILS');
    } else if (step === 'ENTER_DETAILS') {
      setStep('ENTRY_WORKFLOW');
    } else if (step === 'ENTRY_WORKFLOW') {
      setStep('FINAL_REVIEW');
    } else if (step === 'REFINEMENT') {
      setStep('FINAL_REVIEW');
    }
  };

  const handleSwipePrev = () => {
    if (step === 'SELECT_EXAM') {
      setStep('LANDING');
    } else if (step === 'ENTER_DETAILS') {
      setStep('SELECT_EXAM');
    } else if (step === 'COMING_SOON') {
      setStep('SELECT_EXAM');
    } else if (step === 'ENTRY_WORKFLOW') {
      setStep('ENTER_DETAILS');
    } else if (step === 'REFINEMENT') {
      setStep('ENTRY_WORKFLOW');
    } else if (step === 'FINAL_REVIEW') {
      setStep('ENTRY_WORKFLOW');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touchStartRef.current.x - touch.clientX;
    const diffY = touchStartRef.current.y - touch.clientY;

    // Must be a predominantly horizontal swipe, minimum 80px difference
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
      if (diffX > 0) {
        handleSwipeNext();
      } else {
        handleSwipePrev();
      }
    }
    touchStartRef.current = null;
  };

  // Step indicator details
  const getStepNumber = (currentStep: StepType): number => {
    switch (currentStep) {
      case 'SELECT_EXAM': return 1;
      case 'ENTER_DETAILS': return 2;
      case 'ENTRY_WORKFLOW': return 3;
      case 'REFINEMENT': return 4;
      case 'FINAL_REVIEW': return 4;
      default: return 0;
    }
  };

  const totalSteps = 4;
  const currentStepNum = getStepNumber(step);

  const resetSimulation = useCallback(() => {
    localStorage.removeItem('counselor_step');
    localStorage.removeItem('counselor_profile');
    localStorage.removeItem('counselor_selectedOptions');
    localStorage.removeItem('counselor_jee_profile');
    localStorage.removeItem('counselor_jee_choices');
    localStorage.removeItem('counselor_neet_profile');
    localStorage.removeItem('counselor_neet_choices');
    setProfile({
      exam: null,
      stream: 'MPC',
      rank: 15000,
      gender: 'Male',
      category: 'OC',
      region: 'OU',
    });
    setJeeProfile({
      admissionYear: 2025,
      paper: 'Paper 1 (B.E./B.Tech)',
      practiceMode: 'GUIDED',
      stateOfEligibility: 'Andhra Pradesh',
      crlRank: null,
      category: 'OPEN',
      categoryRank: null,
      gender: 'Male',
      isPwd: false
    });
    setNeetProfile({
      admissionYear: 2024,
      allIndiaRank: 18500,
      neetScore: 615,
      category: 'UR',
      gender: 'Male',
      isPwd: false,
      domicileState: 'Andhra Pradesh',
      localArea: 'AU',
      minority: 'NONE',
      pcbMarksPercentage: 75,
      activeAuthority: 'ALL',
      selectedCourses: ['MBBS', 'BDS', 'BAMS']
    });
    setSelectedOptions([]);
    setJeeChoices([]);
    setNeetChoices([]);
    setStep('LANDING');
  }, []);

  // Safe callback updates
  const handleSelectExam = useCallback((exam: ExamType) => {
    if (profile.exam !== exam) setSelectedOptions([]);
    setProfile(prev => {
      let category = prev.category;
      if (exam === 'JEE_MAIN') {
        return {
          ...prev,
          exam,
          stream: 'MPC',
          region: 'AU'
        };
      }
      if (exam === 'NEET_UG') {
        return {
          ...prev,
          exam,
          stream: 'BiPC',
          region: 'AU'
        };
      }
      if (exam === 'AP_EAPCET' && prev.stream === 'BiPC' && ['SC-I', 'SC-II', 'SC-III'].includes(category)) {
        category = 'SC';
      } else if ((exam === 'TS_EAMCET' || prev.stream === 'MPC') && category === 'SC') {
        category = 'SC-I';
      }
      return {
        ...prev,
        exam,
        category,
        // Strictly assign exam-appropriate local area
        region: exam === 'TS_EAMCET' ? 'OU' : 'AU'
      };
    });
  }, [profile.exam]);

  if (sharedData) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center font-mono text-slate-500">Loading shared result...</div>}>
        <SharedResultView
          data={sharedData}
          onNavigateHome={() => {
            navigate('/', { replace: true });
            window.location.search = '';
          }}
        />
      </React.Suspense>
    );
  }

  if (isAdminRoute) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-300 font-medium text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            Initializing Security Sandbox...
          </div>
        </div>
      }>
        <AdminRouteGuard />
        <AuthModal />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans" id="app-root">

      {/* Dynamic Header when inside active counselling wizard or completion screen */}
      {step !== 'LANDING' && (
        <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-2.5 sm:px-6 py-2 sm:py-3.5 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 shrink-0 select-none"
              onClick={resetSimulation}
            >
              <img
                src="/logo.png"
                alt="CounselorPro"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shrink-0 drop-shadow-xs"
              />
              <span className="font-sans font-extrabold text-slate-900 tracking-tight text-sm sm:text-lg truncate">
                Counselor<span className="text-emerald-600">Pro</span>
              </span>
            </motion.div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Wizard Progress bar */}
              {currentStepNum > 0 && (
                <div className="hidden md:flex items-center gap-4 w-full sm:w-auto max-w-md">
                  <span className="text-xs font-mono font-bold text-slate-500 whitespace-nowrap">
                    STEP {currentStepNum} OF {totalSteps}
                  </span>
                  <div className="relative w-full sm:w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute left-0 top-0 bg-emerald-600 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentStepNum / totalSteps) * 100}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">
                    {Math.round((currentStepNum / totalSteps) * 100)}%
                  </span>
                </div>
              )}

              {currentStepNum > 0 && (
                <span className="md:hidden text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {currentStepNum}/{totalSteps}
                </span>
              )}

              {loadingColleges ? (
                <div className="hidden min-[360px]:flex items-center gap-1 px-1.5 py-1 text-slate-500 rounded-lg text-[9px] sm:text-[10px] font-semibold font-mono" aria-live="polite">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Loading
                </div>
              ) : dbStatus.loaded ? (
                <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-[9px] sm:text-xs font-semibold font-mono border border-emerald-100 shadow-2xs whitespace-nowrap">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline">VERIFIED DATA: </span>{dbStatus.count.toLocaleString()} <span className="hidden min-[400px]:inline">COURSES</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] sm:text-xs font-semibold font-mono border border-amber-100 whitespace-nowrap">
                  {profile.exam ? <><span className="hidden sm:inline">NO VERIFIED DATA</span><span className="sm:hidden">NO DATA</span></> : <span className="hidden sm:inline">SELECT AN EXAM</span>}
                </div>
              )}

              {profile.exam === 'JEE_MAIN' && (
                <MotionButton
                  variant="indigo"
                  size="sm"
                  onClick={() => setIsJeeLearningOpen(true)}
                  leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  className="!rounded-lg !py-1 sm:!py-1.5 !px-2 sm:!px-2.5 !text-[10px] sm:!text-xs font-mono font-bold"
                  title="Open Freeze, Float & Slide Educational Guide"
                >
                  <span className="hidden sm:inline">RULE GUIDE</span>
                </MotionButton>
              )}

              {profile.exam === 'NEET_UG' && (
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNeetLearningOpen(true)}
                  leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  className="!rounded-lg !py-1 sm:!py-1.5 !px-2 sm:!px-2.5 !text-[10px] sm:!text-xs font-mono font-bold"
                  title="Open NEET UG MCC & NMC Counselling Guide"
                >
                  <span className="hidden sm:inline">NEET GUIDE</span>
                </MotionButton>
              )}

              {step !== 'LANDING' && step !== 'SUCCESS' && (
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveDraft}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="!rounded-lg !py-1 sm:!py-1.5 !px-2 sm:!px-2.5 !text-[10px] sm:!text-xs font-mono font-bold"
                  title="Save Current Draft"
                  shimmer
                >
                  <span className="hidden sm:inline">SAVE DRAFT</span>
                </MotionButton>
              )}

              <UserNav />
            </div>
          </div>
        </header>
      )}

      {/* Profile Sync Error / Readiness Banner */}
      {user && !isProfileReady && !authLoading && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{profileError || 'Initializing your student profile in the database...'}</span>
          </div>
          <button 
            type="button" 
            onClick={() => retryProfileSync()} 
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            Retry Profile Sync
          </button>
        </div>
      )}

      {/* Main content viewport */}
      <main className="flex-grow flex flex-col w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="flex-grow flex flex-col w-full"
          >
            <React.Suspense fallback={<StepLoadingFallback />}>
              {step === 'LANDING' && (
                <LandingPage
                  onStart={() => setStep('SELECT_EXAM')}
                />
              )}

              {step === 'SELECT_EXAM' && (
                <ExamSelector
                  selectedExam={profile.exam}
                  selectedStream={profile.stream || 'MPC'}
                  onSelect={handleSelectExam}
                  onSelectStream={(stream) => {
                    if (profile.stream !== stream) setSelectedOptions([]);
                    setProfile(prev => ({
                      ...prev,
                      stream,
                      category: (prev.exam === 'AP_EAPCET' && stream === 'BiPC') && ['SC-I', 'SC-II', 'SC-III'].includes(prev.category)
                        ? 'SC'
                        : (prev.exam === 'TS_EAMCET' || stream === 'MPC') && prev.category === 'SC'
                          ? 'SC-I'
                          : prev.category,
                    }));
                  }}
                  onNext={() => {
                    setStep('ENTER_DETAILS');
                  }}
                  onBack={() => setStep('LANDING')}
                />
              )}

              {step === 'COMING_SOON' && (
                <ComingSoon
                  onBack={() => setStep('SELECT_EXAM')}
                />
              )}

              {step === 'ENTER_DETAILS' && (
                profile.exam === 'JEE_MAIN' ? (
                  <JeeProfileForm
                    profile={jeeProfile}
                    onChange={setJeeProfile}
                    onNext={() => setStep('ENTRY_WORKFLOW')}
                    onBack={() => setStep('SELECT_EXAM')}
                    onOpenLearningCentre={() => setIsJeeLearningOpen(true)}
                  />
                ) : profile.exam === 'NEET_UG' ? (
                  <NeetProfileForm
                    profile={neetProfile}
                    onChange={setNeetProfile}
                    onNext={() => setStep('ENTRY_WORKFLOW')}
                    onBack={() => setStep('SELECT_EXAM')}
                    onOpenLearningCentre={() => setIsNeetLearningOpen(true)}
                  />
                ) : (
                  <ProfileForm
                    exam={profile.exam || 'TS_EAMCET'}
                    profile={profile}
                    onChange={setProfile}
                    onNext={() => setStep('ENTRY_WORKFLOW')}
                    onBack={() => setStep('SELECT_EXAM')}
                  />
                )
              )}

              {step === 'ENTRY_WORKFLOW' && (
                profile.exam === 'JEE_MAIN' ? (
                  <JeeOptionEntry
                    profile={jeeProfile}
                    selectedChoices={jeeChoices}
                    onUpdateChoices={setJeeChoices}
                    onNext={() => setStep('FINAL_REVIEW')}
                    onBack={() => setStep('ENTER_DETAILS')}
                    onOpenLearningCentre={() => setIsJeeLearningOpen(true)}
                  />
                ) : profile.exam === 'NEET_UG' ? (
                  <NeetOptionEntry
                    profile={neetProfile}
                    selectedChoices={neetChoices}
                    onUpdateChoices={setNeetChoices}
                    onNext={() => setStep('FINAL_REVIEW')}
                    onBack={() => setStep('ENTER_DETAILS')}
                    onOpenLearningCentre={() => setIsNeetLearningOpen(true)}
                  />
                ) : (
                  <OptionEntry
                    profile={profile}
                    selectedOptions={selectedOptions}
                    onUpdateOptions={setSelectedOptions}
                    onNext={() => setStep('FINAL_REVIEW')}
                    onBack={() => setStep('ENTER_DETAILS')}
                    onOpenAiRefinement={() => setStep('REFINEMENT')}
                  />
                )
              )}

              {step === 'REFINEMENT' && (
                <ChoiceRefinement
                  profile={profile}
                  selectedOptions={selectedOptions}
                  onNext={() => setStep('FINAL_REVIEW')}
                  onBack={() => setStep('ENTRY_WORKFLOW')}
                />
              )}

              {step === 'FINAL_REVIEW' && (
                profile.exam === 'JEE_MAIN' ? (
                  <JeeReviewLock
                    profile={jeeProfile}
                    choices={jeeChoices}
                    onBack={() => setStep('ENTRY_WORKFLOW')}
                    onUnlock={() => setStep('ENTRY_WORKFLOW')}
                    onOpenLearningCentre={() => setIsJeeLearningOpen(true)}
                  />
                ) : profile.exam === 'NEET_UG' ? (
                  <NeetReviewLock
                    profile={neetProfile}
                    choices={neetChoices}
                    onBack={() => setStep('ENTRY_WORKFLOW')}
                    onUnlock={() => setStep('ENTRY_WORKFLOW')}
                    onOpenLearningCentre={() => setIsNeetLearningOpen(true)}
                  />
                ) : (
                  <FinalReview
                    profile={profile}
                    selectedOptions={selectedOptions}
                    onBack={() => setStep('ENTRY_WORKFLOW')}
                    onFinish={() => setStep('SUCCESS')}
                    onOpenAiRefinement={() => setStep('REFINEMENT')}
                  />
                )
              )}

              {step === 'SUCCESS' && (
                <SuccessScreen
                  profile={profile}
                  selectedOptions={selectedOptions}
                  optionsLength={selectedOptions.length}
                  onReset={resetSimulation}
                />
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Save Draft Toast Notification */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-xl border border-slate-800 flex items-center gap-3 z-50"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans font-bold text-sm text-white">Draft Saved Successfully!</p>
              <p className="text-xs text-slate-400">Your profile, preferences, and selected web options are preserved.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JoSAA NIT Counselling Rules & Strategy Learning Centre Modal */}
      {isJeeLearningOpen && (
        <React.Suspense fallback={null}>
          <JeeLearningCentre onClose={() => setIsJeeLearningOpen(false)} />
        </React.Suspense>
      )}

      {/* NEET UG Counselling Rules & Regulations Learning Centre Modal */}
      {isNeetLearningOpen && (
        <React.Suspense fallback={null}>
          <NeetLearningCentre
            isOpen={isNeetLearningOpen}
            onClose={() => setIsNeetLearningOpen(false)}
          />
        </React.Suspense>
      )}



      {/* Global Authentication Modal */}
      <AuthModal />

      {/* 5. UI DB Source Indicator (dev builds only) */}
      {(import.meta as any).env?.DEV && (
        <div className="bg-slate-100 border-t border-slate-200 text-[10px] font-mono text-slate-500 py-1.5 px-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mt-auto shrink-0 select-none">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ⚙️ DEBUG MODE — DB Status: <strong className="text-emerald-700 font-bold">{dbStatus.loaded ? "ONLINE" : "FALLBACK"}</strong>
          </span>
          <span className="truncate">Data Source: <strong className="text-emerald-700 font-bold">{dbStatus.source}</strong> ({dbStatus.count} colleges loaded)</span>
        </div>
      )}
    </div>
  );
}
