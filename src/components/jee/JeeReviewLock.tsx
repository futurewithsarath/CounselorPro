import React, { useState } from 'react';
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

interface JeeReviewLockProps {
  profile: JeeStudentProfile;
  choices: JeePracticeChoice[];
  onBack: () => void;
  onUnlock: () => void;
  onOpenLearningCentre?: () => void;
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

  // Grouping statistics
  const uniqueNits = Array.from(new Set(choices.map(c => c.instituteName)));
  const homeStateChoices = choices.filter(c => c.quotaApplied === 'Home State (HS)');
  const otherStateChoices = choices.filter(c => c.quotaApplied === 'Other State (OS)');

  // Practice Lock action
  const handleLockChoices = () => {
    const lockData: JeePracticeLock = {
      lockedAt: new Date().toISOString(),
      sessionId: `CP-JEE-${Date.now().toString(36).toUpperCase()}`,
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

  // Professional PDF export using jsPDF
  const handleDownloadPdf = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Top Decorative Banner
      doc.setFillColor(49, 46, 129); // indigo-900
      doc.rect(0, 0, pageWidth, 6, 'F');

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text('COUNSELORPRO — JEE MAIN (JoSAA NIT)', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('SIMULATED NIT PREFERENCE PRACTICE SLIP • FOR LEARNING ONLY', 14, 23);

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()} | Session: ${lockedSession?.sessionId || 'PRACTICE-DRAFT'}`, 14, 28);

      // Student Metadata Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 32, pageWidth - 28, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('CLASS XII STATE OF ELIGIBILITY:', 18, 38);
      doc.text('RESERVATION CATEGORY & GENDER:', 18, 44);
      doc.text('TOTAL PREFERENCES FILLED:', 18, 50);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${profile.stateOfEligibility} (Determines Home State Quota)`, 75, 38);
      doc.text(`${profile.category} | ${profile.gender} | PwD: ${profile.isPwd ? 'Yes' : 'No'}`, 75, 44);
      doc.text(`${choices.length} choices across ${uniqueNits.length} National Institutes of Technology`, 75, 50);

      // AutoTable
      const tableData = choices.map(c => [
        c.priority,
        `[${c.instituteCode}] ${c.instituteShortName}`,
        c.programName,
        c.programCode,
        c.quotaApplied,
        c.instituteState
      ]);

      autoTable(doc, {
        startY: 58,
        head: [['Pref #', 'NIT Institute', 'Academic Programme', 'Code', 'Quota', 'State']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [67, 56, 202], // indigo-700
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 46 },
          2: { cellWidth: 62 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 26 },
          5: { cellWidth: 26 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            'CounselorPro JoSAA Practice Tool • This is an offline simulation and not an official JoSAA choice locking submission.',
            14,
            doc.internal.pageSize.getHeight() - 8
          );
        }
      });

      doc.save(`CounselorPro_JEE_NIT_Choices_${Date.now()}.pdf`);
    } catch (e: any) {
      console.error('PDF export error:', e);
      alert('Unable to generate PDF. Using plain text export as fallback.');
      handleDownloadTxt();
    }
  };

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

      {/* Action Navigation Footer */}
      <div className="flex justify-between items-center border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all font-medium flex items-center gap-2 cursor-pointer text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Choice Filling
        </button>
        <div className="flex items-center gap-2">
          {onOpenLearningCentre && (
            <button
              onClick={onOpenLearningCentre}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Learn Post-Allotment (Freeze/Float/Slide)</span>
            </button>
          )}
          {lockedSession ? (
            <button
              onClick={handleDownloadPdf}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Locked Preference Slip</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Practice Choices</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

