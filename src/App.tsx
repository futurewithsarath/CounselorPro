import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ExamSelector from './components/ExamSelector';
import ProfileForm from './components/ProfileForm';
import OptionEntry from './components/OptionEntry';
import ChoiceRefinement from './components/ChoiceRefinement';
import FinalReview from './components/FinalReview';
import ComingSoon from './components/ComingSoon';
import JeeProfileForm from './components/jee/JeeProfileForm';
import JeeOptionEntry from './components/jee/JeeOptionEntry';
import JeeReviewLock from './components/jee/JeeReviewLock';
import JeeLearningCentre from './components/jee/JeeLearningCentre';
import MotionButton from './components/ui/MotionButton';

const SuccessScreen = React.lazy(() => import('./components/SuccessScreen'));
const AdminModal = React.lazy(() => import('./components/AdminModal'));

import { StudentProfile, WebOption, ExamType, JeeStudentProfile, JeePracticeChoice } from './types';
import { Compass, Sparkles, CheckCircle, GraduationCap, Database, Save, RefreshCw, BookOpen } from 'lucide-react';
import { loadRealCollegesForExam, COLLEGES_SOURCE, getDefaultDatasetYear } from './data/colleges';

type StepType = 'LANDING' | 'SELECT_EXAM' | 'ENTER_DETAILS' | 'ENTRY_WORKFLOW' | 'REFINEMENT' | 'FINAL_REVIEW' | 'SUCCESS' | 'COMING_SOON';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Administrative DB setup check based on URL path
  const isAdminOpen = location.pathname === '/admin';

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
  }, [step, isAdminOpen]);

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

  // Save Draft state and handler
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSaveDraft = useCallback(() => {
    localStorage.setItem('counselor_step', step);
    localStorage.setItem('counselor_profile', JSON.stringify(profile));
    localStorage.setItem('counselor_selectedOptions', JSON.stringify(selectedOptions));
    localStorage.setItem('counselor_jee_profile', JSON.stringify(jeeProfile));
    localStorage.setItem('counselor_jee_choices', JSON.stringify(jeeChoices));
    setShowSaveToast(true);
  }, [step, profile, selectedOptions, jeeProfile, jeeChoices]);

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
    switch(currentStep) {
      case 'SELECT_EXAM': return 1;
      case 'ENTER_DETAILS': return 2;
      case 'ENTRY_WORKFLOW': return 3;
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
    setSelectedOptions([]);
    setJeeChoices([]);
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col font-sans" id="app-root">
      
      {/* Dynamic Header when inside active counselling wizard or completion screen */}
      {step !== 'LANDING' && (
        <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-4 sm:px-6 py-2.5 sm:py-3.5 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 cursor-pointer min-w-0 shrink-0 select-none" 
              onClick={resetSimulation}
            >
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-sans font-extrabold text-slate-900 tracking-tight text-base sm:text-lg truncate">CounselorPro</span>
            </motion.div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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

              {currentStepNum > 0 && <span className="md:hidden text-[9px] font-mono font-bold text-slate-500 whitespace-nowrap">{currentStepNum}/{totalSteps}</span>}

              {loadingColleges ? (
                <div className="hidden min-[360px]:flex items-center gap-1 px-2 py-1.5 text-slate-500 rounded-lg text-[10px] font-semibold font-mono" aria-live="polite">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Loading data
                </div>
              ) : dbStatus.loaded ? (
                <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-[9px] sm:text-xs font-semibold font-mono border border-emerald-100 shadow-2xs whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline">VERIFIED DATA: </span>{dbStatus.count.toLocaleString()} <span className="hidden sm:inline">COURSES</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-1.5 sm:px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] sm:text-xs font-semibold font-mono border border-amber-100 whitespace-nowrap">
                  {profile.exam ? <><span className="hidden sm:inline">NO VERIFIED DATA</span><span className="sm:hidden">NO DATA</span></> : <span className="hidden sm:inline">SELECT AN EXAM</span>}
                </div>
              )}

              {profile.exam === 'JEE_MAIN' && (
                <MotionButton
                  variant="indigo"
                  size="sm"
                  onClick={() => setIsJeeLearningOpen(true)}
                  leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  className="!rounded-lg !py-1.5 !px-2.5 !text-[10px] sm:!text-xs font-mono font-bold"
                  title="Open Freeze, Float & Slide Educational Guide"
                >
                  <span className="hidden sm:inline">RULE GUIDE</span>
                </MotionButton>
              )}

              {step !== 'LANDING' && step !== 'SUCCESS' && (
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveDraft}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="!rounded-lg !py-1.5 !px-2.5 !text-[10px] sm:!text-xs font-mono font-bold"
                  title="Save Current Draft"
                  shimmer
                >
                  <span className="hidden sm:inline">SAVE DRAFT</span>
                </MotionButton>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main content viewport */}
      <div 
        className="flex-grow flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="flex-grow flex flex-col"
          >
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
              ) : (
                <OptionEntry
                  profile={profile}
                  selectedOptions={selectedOptions}
                  onUpdateOptions={setSelectedOptions}
                  onNext={() => setStep('FINAL_REVIEW')}
                  onBack={() => setStep('ENTER_DETAILS')}
                />
              )
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
              ) : (
                <FinalReview
                  profile={profile}
                  selectedOptions={selectedOptions}
                  onBack={() => setStep('ENTRY_WORKFLOW')}
                  onFinish={() => setStep('SUCCESS')}
                />
              )
            )}

            {step === 'SUCCESS' && (
              <React.Suspense fallback={<div className="flex-grow flex items-center justify-center p-8 text-slate-500 font-semibold font-mono">Loading success details...</div>}>
                <SuccessScreen
                  profile={profile}
                  selectedOptions={selectedOptions}
                  optionsLength={selectedOptions.length}
                  onReset={resetSimulation}
                />
              </React.Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

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
        <JeeLearningCentre onClose={() => setIsJeeLearningOpen(false)} />
      )}


      
      <React.Suspense fallback={null}>
        <AdminModal 
          isOpen={isAdminOpen} 
          onClose={() => navigate('/')} 
          onUploadSuccess={() => {
            if (profile.exam) {
              loadRealCollegesForExam(profile.exam, profile.stream || 'MPC', getDefaultDatasetYear(profile.exam, profile.stream || 'MPC')).then(count => {
                if (count > 0) {
                  setDbStatus({
                    loaded: true,
                    count,
                    source: COLLEGES_SOURCE
                  });
                }
              });
            }
          }}
        />
      </React.Suspense>

      {/* 5. UI DB Source Indicator (dev builds only) */}
      {(import.meta as any).env?.DEV && (
        <div className="bg-slate-100 border-t border-slate-200 text-[10px] font-mono text-slate-500 py-1.5 px-4 flex items-center justify-between mt-auto shrink-0 select-none">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ⚙️ DEBUG MODE — DB Status: <strong className="text-emerald-700 font-bold">{dbStatus.loaded ? "ONLINE" : "FALLBACK"}</strong>
          </span>
          <span>Data Source: <strong className="text-emerald-700 font-bold">{dbStatus.source}</strong> ({dbStatus.count} colleges loaded)</span>
        </div>
      )}
    </div>
  );
}
