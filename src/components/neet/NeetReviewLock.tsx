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
import { 
  generatePreferenceListPdf, 
  generateMockResultPdf, 
  generateCombinedReportPdf, 
  UniversalChoiceItem 
} from '../../utils/universalPdfService';
import ShareResultModal from '../ShareResultModal';
import { Share2, FileText as FileTextIcon } from 'lucide-react';
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

function generateSecureSessionId(prefix: string): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `${prefix}-${hex}`;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
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

  // Mock Allotment Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [allotmentResult, setAllotmentResult] = useState<{
    allotted: boolean;
    choice?: NeetChoice;
    reason?: string;
  } | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pdfGeneratingType, setPdfGeneratingType] = useState<string | null>(null);

  const getUniversalPreferences = (): UniversalChoiceItem[] => {
    return choices.map(c => ({
      priority: c.priority,
      code: c.collegeCode || c.collegeId,
      name: c.collegeName,
      branchOrProgram: c.course,
      districtOrState: `${c.city}, ${c.state}`,
      authority: c.authority,
      quota: c.quota,
      fee: c.annualFee,
      historicalCutoff: c.cutoffAIR
    }));
  };

  const handleDownloadUniversalPreferenceList = async () => {
    try {
      setPdfGeneratingType('pref');
      setPdfError(null);
      await generatePreferenceListPdf({
        profile: {
          exam: 'NEET_UG',
          stream: profile.selectedCourses?.[0] || 'MBBS',
          rank: profile.allIndiaRank,
          score: profile.neetScore,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.domicileState,
          localArea: profile.localArea
        },
        choices: getUniversalPreferences()
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate Preference List PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const handleDownloadPdf = handleDownloadUniversalPreferenceList;

  const handleDownloadMockResultPdf = async () => {
    try {
      setPdfGeneratingType('mock');
      setPdfError(null);
      const allottedChoice = allotmentResult?.choice;
      await generateMockResultPdf({
        profile: {
          exam: 'NEET_UG',
          stream: profile.selectedCourses?.[0] || 'MBBS',
          rank: profile.allIndiaRank,
          score: profile.neetScore,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.domicileState,
          localArea: profile.localArea
        },
        choices: getUniversalPreferences(),
        mockResult: {
          allotted: allotmentResult?.allotted ?? false,
          collegeName: allottedChoice?.collegeName,
          collegeCode: allottedChoice?.collegeCode,
          branchName: allottedChoice?.course,
          preferenceNumber: allottedChoice?.priority,
          allotmentType: allottedChoice ? `${allottedChoice.authority} (${allottedChoice.quota})` : undefined,
          fee: allottedChoice?.annualFee,
          notes: allotmentResult?.reason
        }
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate Mock Result PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const handleDownloadCombinedReportPdf = async () => {
    try {
      setPdfGeneratingType('combined');
      setPdfError(null);
      const allottedChoice = allotmentResult?.choice;
      await generateCombinedReportPdf({
        profile: {
          exam: 'NEET_UG',
          stream: profile.selectedCourses?.[0] || 'MBBS',
          rank: profile.allIndiaRank,
          score: profile.neetScore,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.domicileState,
          localArea: profile.localArea
        },
        choices: getUniversalPreferences(),
        mockResult: allotmentResult ? {
          allotted: allotmentResult.allotted,
          collegeName: allottedChoice?.collegeName,
          collegeCode: allottedChoice?.collegeCode,
          branchName: allottedChoice?.course,
          preferenceNumber: allottedChoice?.priority,
          allotmentType: allottedChoice ? `${allottedChoice.authority} (${allottedChoice.quota})` : undefined,
          fee: allottedChoice?.annualFee,
          notes: allotmentResult.reason
        } : undefined
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setPdfError(err?.message || 'Failed to generate Combined Report PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const socialCardData = {
    exam: 'NEET_UG',
    stream: profile.selectedCourses?.[0] || 'MBBS',
    rank: profile.allIndiaRank,
    category: profile.category,
    totalChoices: choices.length,
    allotted: Boolean(allotmentResult?.allotted),
    collegeName: allotmentResult?.choice?.collegeName || choices[0]?.collegeName,
    collegeCode: allotmentResult?.choice?.collegeCode || choices[0]?.collegeCode,
    branchName: allotmentResult?.choice?.course || choices[0]?.course,
    preferenceNumber: allotmentResult?.choice?.priority || (choices.length > 0 ? 1 : undefined)
  };

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
      sessionId: generateSecureSessionId('NEET-PRACTICE'),
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

        {/* Universal Download & Result Sharing Command Hub */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4 border border-emerald-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Official Practice Documentation & Social Sharing
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Universal PDF Downloads & Result Sharing
              </h3>
              <p className="text-xs text-slate-300">
                Generate verified PDF documents with repeated headers and running page counts, or export 9:16 / 1:1 social cards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleDownloadUniversalPreferenceList}
              disabled={pdfGeneratingType !== null}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700 text-xs font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{pdfGeneratingType === 'pref' ? 'Generating...' : 'Preference List (PDF)'}</span>
            </MotionButton>

            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleDownloadMockResultPdf}
              disabled={pdfGeneratingType !== null || !allotmentResult}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700 text-xs font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{pdfGeneratingType === 'mock' ? 'Generating...' : 'Mock Result (PDF)'}</span>
            </MotionButton>

            <MotionButton
              variant="outline"
              size="sm"
              onClick={handleDownloadCombinedReportPdf}
              disabled={pdfGeneratingType !== null}
              className="bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700 text-xs font-semibold py-2.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileTextIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>{pdfGeneratingType === 'combined' ? 'Generating...' : 'Combined Report (PDF)'}</span>
            </MotionButton>

            <MotionButton
              variant="primary"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold py-2.5 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Share My Result</span>
            </MotionButton>
          </div>
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
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-xs text-slate-900">
                Ready to Lock Practice Choices?
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Locking creates an authentic printable slip and completes this counselling practice simulation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <MotionButton
                variant="outline"
                size="md"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-semibold"
                leftIcon={isGeneratingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-600" />}
              >
                {isGeneratingPdf ? 'Generating PDF...' : 'Download My Preference List (PDF)'}
              </MotionButton>

              <MotionButton
                variant="primary"
                size="md"
                onClick={() => setShowConfirmModal(true)}
                className="w-full sm:w-auto text-xs"
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

      {/* Universal Share Result Modal */}
      <ShareResultModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        cardData={socialCardData}
      />

      {/* Bottom Navigation */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-slate-200 pt-6">
        <MotionButton
          variant="ghost"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Back to Option Entry
        </MotionButton>

        <MotionButton
          variant="outline"
          size="md"
          onClick={onOpenLearningCentre}
          leftIcon={<BookOpen className="w-4 h-4 text-emerald-600" />}
          className="w-full sm:w-auto"
        >
          View Counselling Rules
        </MotionButton>
      </div>
    </div>
  );
}
