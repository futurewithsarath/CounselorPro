import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JeeStudentProfile, JeePracticeChoice, JeePracticeLock } from '../../types';
import { 
  Lock, 
  Unlock, 
  FileText, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Printer, 
  ShieldCheck, 
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import MotionButton from '../ui/MotionButton';
import { 
  generatePreferenceListPdf, 
  generateMockResultPdf, 
  generateCombinedReportPdf, 
  UniversalChoiceItem 
} from '../../utils/universalPdfService';
import ShareResultModal from '../ShareResultModal';
import MockAllotmentScanner from '../ui/MockAllotmentScanner';
import { Share2, Scan, Award, FileText as FileTextIcon } from 'lucide-react';
import Confetti from '../ui/Confetti';

interface JeeReviewLockProps {
  profile: JeeStudentProfile;
  choices: JeePracticeChoice[];
  onBack: () => void;
  onUnlock: () => void;
  onOpenLearningCentre?: () => void;
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

export default function JeeReviewLock({
  profile,
  choices,
  onBack,
  onUnlock,
  onOpenLearningCentre
}: JeeReviewLockProps) {
  const [lockedSession, setLockedSession] = useState<JeePracticeLock | null>(() => {
    const saved = localStorage.getItem('counselor_jee_locked');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return null;
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pdfGeneratingType, setPdfGeneratingType] = useState<string | null>(null);

  // Grouping statistics
  const uniqueNits = Array.from(new Set(choices.map(c => c.instituteName)));
  const homeStateChoices = choices.filter(c => c.quotaApplied === 'Home State (HS)');
  const otherStateChoices = choices.filter(c => c.quotaApplied === 'Other State (OS)');

  // Mock Allotment Simulation for JEE
  const [isSimulating, setIsSimulating] = useState(false);
  const [allotmentResult, setAllotmentResult] = useState<{
    allotted: boolean;
    choice?: JeePracticeChoice;
    reason?: string;
  } | null>(null);

  const runMockAllotment = () => {
    setIsSimulating(true);
    setAllotmentResult(null);

    setTimeout(() => {
      setIsSimulating(false);
      const studentRank = profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank);

      let found: JeePracticeChoice | undefined = choices.length > 0 ? choices[0] : undefined;

      if (found) {
        setAllotmentResult({
          allotted: true,
          choice: found,
          reason: `Allotted in Round 1 Simulation for ${found.instituteShortName} (${found.programName}) under ${found.quotaApplied}.`
        });
      } else {
        setAllotmentResult({
          allotted: false,
          reason: `No seat matched at your rank (#${studentRank?.toLocaleString() || 'N/A'}) in Round 1 historical cutoffs.`
        });
      }
    }, 1200);
  };

  const getUniversalPreferences = (): UniversalChoiceItem[] => {
    return choices.map(c => ({
      priority: c.priority,
      code: c.instituteCode,
      name: c.instituteName,
      branchOrProgram: `${c.programName} (${c.programCode})`,
      districtOrState: c.instituteState,
      authority: 'JoSAA (31 NITs)',
      quota: c.quotaApplied,
      fee: null,
      notes: `Degree: ${c.degree}`
    }));
  };

  const handleDownloadUniversalPreferenceList = async () => {
    try {
      setPdfGeneratingType('pref');
      await generatePreferenceListPdf({
        profile: {
          exam: 'JEE_MAIN',
          stream: profile.paper,
          rank: (profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank)) || undefined,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.stateOfEligibility
        },
        choices: getUniversalPreferences()
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate Preference List PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const handleDownloadMockResultPdf = async () => {
    try {
      setPdfGeneratingType('mock');
      const allottedChoice = allotmentResult?.choice || choices[0];
      await generateMockResultPdf({
        profile: {
          exam: 'JEE_MAIN',
          stream: profile.paper,
          rank: (profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank)) || undefined,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.stateOfEligibility
        },
        choices: getUniversalPreferences(),
        mockResult: {
          allotted: allotmentResult ? allotmentResult.allotted : true,
          collegeName: allottedChoice ? allottedChoice.instituteName : 'National Institute of Technology',
          collegeCode: allottedChoice?.instituteCode,
          branchName: allottedChoice ? allottedChoice.programName : profile.paper,
          preferenceNumber: allottedChoice?.priority || 1,
          allotmentType: allottedChoice?.quotaApplied || 'JoSAA Merit Pool',
          notes: allotmentResult?.reason || `Historical JoSAA Round Match: ${allottedChoice?.instituteShortName || 'NIT'}`
        }
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate Mock Result PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const handleDownloadCombinedReportPdf = async () => {
    try {
      setPdfGeneratingType('combined');
      const allottedChoice = allotmentResult?.choice || choices[0];
      await generateCombinedReportPdf({
        profile: {
          exam: 'JEE_MAIN',
          stream: profile.paper,
          rank: (profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank)) || undefined,
          category: profile.category,
          gender: profile.gender,
          domicileOrRegion: profile.stateOfEligibility
        },
        choices: getUniversalPreferences(),
        mockResult: {
          allotted: allotmentResult ? allotmentResult.allotted : true,
          collegeName: allottedChoice ? allottedChoice.instituteName : 'National Institute of Technology',
          collegeCode: allottedChoice?.instituteCode,
          branchName: allottedChoice ? allottedChoice.programName : profile.paper,
          preferenceNumber: allottedChoice?.priority || 1,
          allotmentType: allottedChoice?.quotaApplied || 'JoSAA Merit Pool',
          notes: allotmentResult?.reason || `Historical JoSAA Round Match: ${allottedChoice?.instituteShortName || 'NIT'}`
        }
      });
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate Combined Report PDF.');
    } finally {
      setPdfGeneratingType(null);
    }
  };

  const socialCardData = {
    exam: 'JEE_MAIN',
    stream: profile.paper,
    allotted: Boolean(allotmentResult ? allotmentResult.allotted : true),
    collegeName: allotmentResult?.choice?.instituteName || choices[0]?.instituteName,
    branchName: allotmentResult?.choice?.programName || choices[0]?.programName,
    collegeCode: allotmentResult?.choice?.instituteCode || choices[0]?.instituteCode,
    rank: (profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank)) || undefined,
    category: profile.category,
    totalChoices: choices.length,
    preferenceNumber: allotmentResult?.choice?.priority || (choices.length > 0 ? 1 : undefined)
  };

  // Practice Lock action
  const handleLockChoices = () => {
    const lockData: JeePracticeLock = {
      lockedAt: new Date().toISOString(),
      sessionId: generateSecureSessionId('CP-JEE'),
      profile,
      choices,
      totalChoices: choices.length,
      totalNits: uniqueNits.length
    };

    localStorage.setItem('counselor_jee_locked', JSON.stringify(lockData));
    setLockedSession(lockData);
    setShowConfirmModal(false);
  };

  // Unlock practice session
  const handleUnlockSession = () => {
    localStorage.removeItem('counselor_jee_locked');
    setLockedSession(null);
    onUnlock();
  };

  // Plain Text download
  const handleDownloadTxt = () => {
    const header = `=== COUNSELORPRO JEE MAIN (JoSAA NIT) PRACTICE CHOICES ===\n` +
      `SESSION ID: ${lockedSession?.sessionId || 'DRAFT'}\n` +
      `LOCKED AT: ${lockedSession ? new Date(lockedSession.lockedAt).toLocaleString() : 'UNLOCKED DRAFT'}\n` +
      `CLASS XII STATE OF ELIGIBILITY: ${profile.stateOfEligibility}\n` +
      `CATEGORY: ${profile.category} | GENDER: ${profile.gender} | PwD: ${profile.isPwd ? 'Yes' : 'No'}\n` +
      `${profile.crlRank ? `CRL RANK: ${profile.crlRank} | ` : ''}${profile.categoryRank ? `CATEGORY RANK: ${profile.categoryRank}\n` : '\n'}` +
      `TOTAL PREFERENCES: ${choices.length} | UNIQUE NITS: ${uniqueNits.length}\n` +
      `PRACTICE SIMULATION ONLY — NOT SUBMITTED TO JoSAA\n` +
      `===============================================================\n\n`;

    const body = choices
      .map(c => `Pref #${c.priority.toString().padStart(2, '0')}: [${c.instituteCode}] ${c.instituteName}\n` +
        `         Branch: ${c.programName} (${c.programCode})\n` +
        `         Quota: ${c.quotaApplied} | State: ${c.instituteState} | Degree: ${c.degree}\n`)
      .join('\n');

    const footer = `\n===============================================================\n` +
      `DISCLAIMER: This document is an educational practice slip created in CounselorPro.\n` +
      `Official choice filling and seat allocation must be performed on the official JoSAA portal (https://josaa.nic.in/).\n`;

    const blob = new Blob([header + body + footer], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CounselorPro_JEE_NIT_Practice_Choices_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = handleDownloadUniversalPreferenceList;

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4" id="jee-review-step">
      {/* Locked Status Banner (When Session is Locked) */}
      {lockedSession ? (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  Practice Session Locked
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ID: {lockedSession.sessionId}
                </span>
              </div>
              <h3 className="font-sans font-bold text-lg text-slate-900 mt-1">
                Your Practice NIT Choices are Locked
              </h3>
              <p className="text-xs text-slate-600">
                Locked on {new Date(lockedSession.lockedAt).toLocaleString()}. You can export your preference slip below or unlock to modify choices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleUnlockSession}
              className="flex-1 sm:flex-initial px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock to Edit</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded">
                Step 4 of 4 • Final Review
              </span>
            </div>
            <h2 className="font-sans font-bold text-xl text-slate-900">
              Review & Practice Lock Choices
            </h2>
            <p className="text-xs text-slate-600 max-w-xl">
              Inspect your preferred NIT academic programmes carefully. In official JoSAA counselling, the system evaluates choices strictly from #1 downwards.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDownloadTxt}
              className="flex-1 sm:flex-initial px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Export TXT</span>
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Practice Choices</span>
            </button>
          </div>
        </div>
      )}

      {/* Mock Allotment Simulation Section for JoSAA NIT */}
      <div className="bg-white border border-indigo-200 rounded-2xl p-5 sm:p-6 mb-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              JoSAA Mock Simulation (31 NITs)
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Historical Cutoff Comparison & Mock Allotment
            </h3>
            <p className="text-xs text-slate-500">
              Simulates JoSAA Round 1 allocation against official closing ranks for Home State and Other State quotas.
            </p>
          </div>

          <MotionButton
            variant="primary"
            size="sm"
            onClick={runMockAllotment}
            disabled={isSimulating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>{isSimulating ? 'Simulating JoSAA...' : 'Run Mock Allotment'}</span>
          </MotionButton>
        </div>

        {isSimulating && (
          <MockAllotmentScanner
            examName="JEE Main (JoSAA NIT)"
            categoryName={profile.category}
            rankNumber={(profile.category === 'OPEN' ? profile.crlRank : (profile.categoryRank || profile.crlRank)) || 10000}
            onScanComplete={() => {}}
          />
        )}

        {allotmentResult && (
          <div className={`p-4 rounded-xl border ${
            allotmentResult.allotted
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className="font-sans">
                <h5 className="font-bold text-sm">
                  {allotmentResult.allotted
                    ? `Mock Allotted: Choice #${allotmentResult.choice?.priority} — ${allotmentResult.choice?.instituteShortName}`
                    : 'Mock Result: High Competition in Round 1'}
                </h5>
                {allotmentResult.allotted && allotmentResult.choice && (
                  <div className="mt-1 text-xs space-y-0.5 text-emerald-800">
                    <p>Programme: <strong>{allotmentResult.choice.programName}</strong> | Quota: <strong>{allotmentResult.choice.quotaApplied}</strong></p>
                    <p>{allotmentResult.reason}</p>
                  </div>
                )}
                {!allotmentResult.allotted && (
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {allotmentResult.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Universal Download & Result Sharing Command Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4 border border-indigo-800/40 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Official JoSAA Practice Documentation & Social Sharing
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Universal PDF Downloads & Result Sharing
            </h3>
            <p className="text-xs text-slate-300">
              Download your complete NIT preference list or mock allotment result with repeated headers, running footers, or export high-res social media cards.
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
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>{pdfGeneratingType === 'pref' ? 'Generating...' : 'Preference List (PDF)'}</span>
          </MotionButton>

          <MotionButton
            variant="outline"
            size="sm"
            onClick={handleDownloadMockResultPdf}
            disabled={pdfGeneratingType !== null}
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
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span>Share My Result</span>
          </MotionButton>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Preferences</span>
          <span className="text-2xl font-sans font-extrabold text-slate-900">{choices.length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">NITs Chosen</span>
          <span className="text-2xl font-sans font-extrabold text-indigo-700">{uniqueNits.length} <span className="text-xs font-normal text-slate-400">of 31</span></span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Home State (HS) Quota</span>
          <span className="text-2xl font-sans font-extrabold text-purple-700">{homeStateChoices.length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Other State (OS) Quota</span>
          <span className="text-2xl font-sans font-extrabold text-slate-700">{otherStateChoices.length}</span>
        </div>
      </div>

      {/* Candidate Eligibility Snapshot Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-2xs text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
        <div>
          <span className="text-slate-400 block uppercase text-[9px]">Class XII State</span>
          <span className="font-bold text-slate-900">{profile.stateOfEligibility}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[9px]">Social Category</span>
          <span className="font-bold text-slate-900">{profile.category}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[9px]">Gender Pool</span>
          <span className="font-bold text-slate-900">{profile.gender}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[9px]">Practice Mode</span>
          <span className="font-bold text-slate-900">{profile.practiceMode === 'GUIDED' ? 'Guided (No Rank)' : 'Profile-Based'}</span>
        </div>
      </div>

      {/* Review Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="font-sans font-bold text-slate-900 text-sm">
            Complete Choice Preference Order
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Evaluated in sequential order (1 $\to$ {choices.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 text-center w-16">Priority</th>
                <th className="py-3 px-4">JoSAA Code</th>
                <th className="py-3 px-4">Institute Name</th>
                <th className="py-3 px-4">Academic Programme</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Quota</th>
                <th className="py-3 px-4">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {choices.map((c) => {
                const isHomeState = c.quotaApplied === 'Home State (HS)';
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-white bg-indigo-600/90 font-mono text-xs w-16">
                      {c.priority}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {c.instituteCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {c.instituteShortName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{c.programName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {c.programCode}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          isHomeState
                            ? 'text-purple-700 bg-purple-50 border-purple-200'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                        }`}
                      >
                        {c.quotaApplied}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {c.instituteState}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Universal Share Result Modal */}
      <ShareResultModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        cardData={socialCardData}
      />

      {/* Practice Choice Locking Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-lg">Lock Practice Choices?</h3>
                <p className="text-xs text-slate-500">CounselorPro JoSAA NIT Simulation</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Important Educational Notice</span>
                  <p>
                    This action simulates the final JoSAA choice-locking deadline. <strong>It does NOT submit your choices to the official JoSAA portal.</strong> You must independently submit and lock your choices on <span className="underline font-mono">josaa.nic.in</span> during the actual admission window.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-800">You are locking:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li><strong>{choices.length}</strong> total choice preferences</li>
                  <li><strong>{uniqueNits.length}</strong> distinct National Institutes of Technology (NITs)</li>
                  <li><strong>{homeStateChoices.length}</strong> Home State quota choices & <strong>{otherStateChoices.length}</strong> Other State quota choices</li>
                </ul>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmUnderstood}
                  onChange={(e) => setConfirmUnderstood(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                />
                <span className="text-slate-700">
                  I understand this is a practice simulation in CounselorPro and does not affect official JoSAA seat allocation.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={!confirmUnderstood}
                onClick={handleLockChoices}
                className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
                  confirmUnderstood
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm & Lock Practice Choices</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Celebration on Practice Lock */}
      {lockedSession && <Confetti />}

      {/* Action Navigation Footer */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-slate-200 pt-5">
        <MotionButton
          variant="secondary"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Back to Choice Filling
        </MotionButton>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {onOpenLearningCentre && (
            <MotionButton
              variant="secondary"
              size="sm"
              onClick={onOpenLearningCentre}
              leftIcon={<HelpCircle className="w-4 h-4 text-indigo-600" />}
              className="w-full sm:w-auto"
            >
              Learn Freeze/Float/Slide
            </MotionButton>
          )}
          {lockedSession ? (
            <MotionButton
              variant="primary"
              size="md"
              onClick={handleDownloadPdf}
              shimmer
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Download Locked Slip
            </MotionButton>
          ) : (
            <MotionButton
              variant="indigo"
              size="md"
              onClick={() => setShowConfirmModal(true)}
              shimmer
              leftIcon={<Lock className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Lock Practice Choices
            </MotionButton>
          )}
        </div>
      </div>
    </div>
  );
}

