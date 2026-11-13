import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  Lock, 
  Unlock, 
  Printer, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Award, 
  Building2, 
  AlertCircle, 
  BookOpen, 
  Check, 
  X,
  Stethoscope,
  Scan,
  RefreshCw
} from 'lucide-react';
import { NeetStudentProfile, NeetChoice, NeetPracticeLock } from '../../types';
import { generateNeetPreferencePdf } from '../../utils/neetPdfExport';
import MotionButton from '../ui/MotionButton';
import Confetti from '../ui/Confetti';
import MockAllotmentScanner from '../ui/MockAllotmentScanner';

interface NeetReviewLockProps {
  profile: NeetStudentProfile;
  choices: NeetChoice[];
  onBack: () => void;
  onUnlock: () => void;
  onOpenLearningCentre: () => void;
}

export default function NeetReviewLock({
  profile,
  choices,
  onBack,
  onUnlock,
  onOpenLearningCentre
}: NeetReviewLockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lockData, setLockData] = useState<NeetPracticeLock | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3200);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfError(null);
      await generateNeetPreferencePdf({
        profile,
        choices,
        lockData,
        isLocked
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Mock Allotment Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [allotmentResult, setAllotmentResult] = useState<{
    allotted: boolean;
    choice?: NeetChoice;
    reason?: string;
  } | null>(null);

  // Run Mock Allotment
  const runMockAllotment = () => {
    setIsSimulating(true);
    setAllotmentResult(null);

    // After 1.2s scan completes, evaluate sequential choice list
    setTimeout(() => {
      setIsSimulating(false);
      // Find the first choice in priority order where candidate AIR is <= cutoffAIR
      let found: NeetChoice | undefined = undefined;
      for (const ch of choices) {
        if (ch.cutoffAIR && profile.allIndiaRank <= ch.cutoffAIR) {
          found = ch;
          break;
        }
      }

      if (found) {
        setAllotmentResult({
          allotted: true,
          choice: found,
          reason: `Allotted in Round 1 Mock simulation based on official 2024 cutoff (AIR #${found.cutoffAIR?.toLocaleString()}).`
        });
        setShowConfetti(true);
      } else {
        setAllotmentResult({
          allotted: false,
          reason: `No seat allotted at your current AIR #${profile.allIndiaRank.toLocaleString()} in this initial mock phase. In actual counselling, subsequent rounds (Round 2, Round 3 / Mop-Up, and Stray Vacancy) expand cutoff ranks significantly.`
        });
      }
    }, 1300);
  };

  // Perform practice choice locking
  const handleLockChoices = () => {
    const authorityBreakdown: Record<any, number> = { MCC: 0, AP_STATE: 0, TG_STATE: 0, AACCC: 0 };
    const courseBreakdown: Record<any, number> = { MBBS: 0, BDS: 0, BAMS: 0, BHMS: 0, BUMS: 0, BSMS: 0 };

    choices.forEach(c => {
      authorityBreakdown[c.authority] = (authorityBreakdown[c.authority] || 0) + 1;
      courseBreakdown[c.course] = (courseBreakdown[c.course] || 0) + 1;
    });

    const newLock: NeetPracticeLock = {
      lockedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      sessionId: `NEET-PRACTICE-${Date.now().toString().slice(-6)}`,
      profile,
      choices,
      totalChoices: choices.length,
      totalColleges: new Set(choices.map(c => c.collegeId)).size,
      authorityBreakdown,
      courseBreakdown
    };

    setLockData(newLock);
    setIsLocked(true);
    setShowConfirmModal(false);
    setShowConfetti(true);
    localStorage.setItem('counselor_neet_lock', JSON.stringify(newLock));
  };

  const handleDownloadTxt = () => {
    const textLines = [
      '========================================================================',
      '        COUNSELORPRO — NEET UG PRACTICE WEB OPTIONS LOCK SLIP          ',
      '========================================================================',
      `Session ID:     ${lockData?.sessionId || 'NEET-MOCK-SESSION'}`,
      `Locked At:      ${lockData?.lockedAt || new Date().toLocaleString()}`,
      `Candidate AIR:  ${profile.allIndiaRank.toLocaleString()}`,
      `NEET Score:     ${profile.neetScore} / 720`,
      `Category:       ${profile.category}`,
      `Gender:         ${profile.gender}`,
      `Domicile:       ${profile.domicileState}`,
      `PCB Aggregate:  ${profile.pcbMarksPercentage}%`,
      `Total Choices:  ${choices.length}`,
      '------------------------------------------------------------------------',
      'PREFERENCE SEQUENCE:',
      '------------------------------------------------------------------------',
      ...choices.map((c, i) => 
        `#${String(i + 1).padStart(2, '0')} | ${c.course.padEnd(5)} | [${c.authority.padEnd(8)}] ${c.shortName} (${c.city}, ${c.state})`
      ),
      '========================================================================',
      'NOTE: This is a practice simulation generated on CounselorPro for candidate',
      'preparation. It does not replace official submission on mcc.nic.in,',
      'drysruhs.edu.in, knruhs.telangana.gov.in, or aaccc.gov.in.',
      '========================================================================'
    ];

    const element = document.createElement('a');
    const file = new Blob([textLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `NEET_UG_Practice_Choices_${profile.allIndiaRank}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="neet-review-lock-step">
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Step 4 of 4 • Final Review & Lock
        </span>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          Review & Practice Choice Locking
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
          Verify your sequenced options, test choices with the instant Mock Allotment Scanner, and simulate official practice choice locking.
        </p>
      </div>

      {/* Main Review Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Profile Details Summary Strip */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm text-slate-900">NEET UG Candidate Summary</span>
            </div>
            <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              AIR: #{profile.allIndiaRank.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-xs">
            <div>
              <span className="text-slate-400 block font-mono text-[10px] uppercase">NEET Score</span>
              <span className="font-bold text-slate-900">{profile.neetScore} / 720</span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Category</span>
              <span className="font-bold text-slate-900">{profile.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[10px] uppercase">Domicile State</span>
              <span className="font-bold text-slate-900">{profile.domicileState}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-mono text-[10px] uppercase">PCB Percentage</span>
              <span className="font-bold text-emerald-700">{profile.pcbMarksPercentage}% (Eligible)</span>
            </div>
          </div>
        </div>

        {/* Mock Allotment Simulation Section */}
        <div className="p-5 border border-emerald-200 bg-emerald-50/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-sans font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                NEET UG Mock Allotment Simulation
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Evaluates your sequence against official 2024 closing ranks across MCC, Dr. YSRUHS, KNRUHS & AACCC.
              </p>
            </div>

            <MotionButton
              variant="primary"
              size="sm"
              onClick={runMockAllotment}
              disabled={isSimulating}
              className="text-xs"
              leftIcon={<Scan className="w-3.5 h-3.5" />}
            >
              {isSimulating ? 'Simulating Allotment...' : 'Run Mock Allotment'}
            </MotionButton>
          </div>

          {isSimulating && (
            <MockAllotmentScanner 
              examName="NEET UG"
              categoryName={profile.category}
              rankNumber={profile.allIndiaRank}
              onScanComplete={() => {}} 
            />
          )}

          {allotmentResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`p-4 rounded-xl border mt-3 ${
                allotmentResult.allotted
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {allotmentResult.allotted ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h5 className="font-bold text-sm">
                    {allotmentResult.allotted
                      ? `Mock Allotted: Choice #${allotmentResult.choice?.priority} — ${allotmentResult.choice?.shortName}`
                      : 'Mock Result: High Competition in Round 1'}
                  </h5>
                  {allotmentResult.allotted && allotmentResult.choice && (
                    <div className="mt-1 text-xs space-y-0.5">
                      <p>
                        Program: <strong>{allotmentResult.choice.course}</strong> | Quota: <strong>{allotmentResult.choice.quota.replace('_', ' ')}</strong> | Authority: <strong>{allotmentResult.choice.authority}</strong>
                      </p>
                      <p className="text-emerald-800">
                        {allotmentResult.reason}
                      </p>
                    </div>
                  )}
                  {!allotmentResult.allotted && (
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {allotmentResult.reason}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* PDF Generation Error Alert */}
        {pdfError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{pdfError}</span>
            </div>
            <button onClick={() => setPdfError(null)} className="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
          </div>
        )}

        {/* Choices List Table */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h4 className="font-sans font-bold text-sm text-slate-900">
                Submitted Preference Order ({choices.length} Choices)
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Priority 1 is Highest
              </span>
            </div>

            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-semibold"
              leftIcon={isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-600" />}
            >
              {isGeneratingPdf ? 'Generating PDF...' : 'Download My Preference List (PDF)'}
            </MotionButton>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {choices.map((choice) => (
              <div key={choice.id} className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-mono font-bold flex items-center justify-center shrink-0">
                    {choice.priority}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 truncate">
                        {choice.shortName}
                      </span>
                      <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded font-bold">
                        {choice.course}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 rounded">
                        {choice.authority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {choice.collegeName} • {choice.city}, {choice.state}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  {choice.cutoffAIR && (
                    <span className="text-slate-500">
                      Closing: #{choice.cutoffAIR.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Locked State Banner or Action Banner */}
        {isLocked && lockData ? (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                Practice Choices Locked Successfully
              </span>
              <span className="font-mono text-emerald-800 text-[11px]">
                Session ID: {lockData.sessionId}
              </span>
            </div>
            <p className="text-emerald-800">
              Your practice choices were locked at <strong>{lockData.lockedAt}</strong>. You can download or print your official practice option sheet below.
            </p>
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <MotionButton
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                leftIcon={isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
              >
                {isGeneratingPdf ? 'Generating PDF...' : 'Download My Preference List (PDF)'}
              </MotionButton>

              <MotionButton
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="text-xs bg-white"
              >
                Download (.txt)
              </MotionButton>

              <MotionButton
                variant="outline"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                className="text-xs bg-white"
              >
                Print Slip
              </MotionButton>

              <MotionButton
                variant="ghost"
                size="sm"
                onClick={onUnlock}
                leftIcon={<Unlock className="w-3.5 h-3.5" />}
                className="text-xs text-slate-600 ml-auto"
              >
                Unlock & Edit Options
              </MotionButton>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-bold text-xs text-slate-900">
                Ready to Lock Practice Choices?
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Locking creates an authentic printable slip and completes this counselling practice simulation.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <MotionButton
                variant="outline"
                size="md"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-semibold"
                leftIcon={isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-600" />}
              >
                {isGeneratingPdf ? 'Generating PDF...' : 'Download My Preference List (PDF)'}
              </MotionButton>

              <MotionButton
                variant="primary"
                size="md"
                onClick={() => setShowConfirmModal(true)}
                className="text-xs"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
              >
                Lock Practice Choices
              </MotionButton>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-slate-900">
                    Confirm Practice Choice Locking
                  </h3>
                  <p className="text-xs text-slate-500">
                    Simulating official choice submission
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to lock <strong>{choices.length} options</strong>. In genuine MCC / State counselling, choice locking is final and cannot be modified after the deadline without unlocking facility.
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-700">
                <div>Candidate: <strong>AIR #{profile.allIndiaRank.toLocaleString()}</strong></div>
                <div>Total Choices: <strong>{choices.length}</strong></div>
                <div>Top Choice: <strong>{choices[0]?.shortName}</strong></div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <MotionButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </MotionButton>

                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={handleLockChoices}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Yes, Lock Choices
                </MotionButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="mt-6 flex justify-between items-center border-t border-slate-200 pt-6">
        <MotionButton
          variant="ghost"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Option Entry
        </MotionButton>

        <MotionButton
          variant="outline"
          size="md"
          onClick={onOpenLearningCentre}
          leftIcon={<BookOpen className="w-4 h-4 text-emerald-600" />}
        >
          View Counselling Rules
        </MotionButton>
      </div>
    </div>
  );
}
