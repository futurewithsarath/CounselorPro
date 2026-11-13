import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  X, 
  CheckCircle2, 
  HelpCircle, 
  Building2, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  ArrowDown, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  Play
} from 'lucide-react';

interface JeeLearningCentreProps {
  onClose?: () => void;
}

export default function JeeLearningCentre({ onClose }: JeeLearningCentreProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'quotas' | 'preference' | 'willingness'>('willingness');
  const [interactiveChoice, setInteractiveChoice] = useState<'FREEZE' | 'FLOAT' | 'SLIDE'>('FLOAT');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal/Panel Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-5 sm:p-6 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-200 bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-700">
              <BookOpen className="w-3.5 h-3.5" />
              <span>JoSAA NIT Counselling Learning Centre</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-white">
              Official JoSAA Admission Concepts & Rules
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
              Understand the exact official JoSAA processes, 50% Home State vs Other State quotas, and post-allotment willingness options (Freeze, Float, Slide).
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Close Learning Centre (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('willingness')}
            className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'willingness'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-indigo-600" />
            <span>Interactive Freeze, Float & Slide</span>
          </button>
          <button
            onClick={() => setActiveTab('quotas')}
            className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'quotas'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>50:50 Home State vs. Other State</span>
          </button>
          <button
            onClick={() => setActiveTab('preference')}
            className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'preference'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Choice Filling Strategy</span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Post-Allotment Steps</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
        {/* TAB 1: INTERACTIVE FREEZE, FLOAT & SLIDE */}
        {activeTab === 'willingness' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
              <strong>Official JoSAA Definition:</strong> Freeze, Float, and Slide are <em>post-allotment willingness options</em> chosen <strong>after</strong> a seat has been allocated in a counselling round. They are not choice-filling actions. Choosing any option requires completing <strong>online reporting, paying the Seat Acceptance Fee (SAF), and uploading required documents</strong>.
            </div>

            {/* Interactive Simulation Walkthrough */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-sans font-bold text-slate-900 text-sm">
                  Interactive Scenario: What Happens to Your Choices?
                </h3>
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                  Suppose you are allotted Choice #4 in Round 1
                </span>
              </div>

              {/* Selector Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setInteractiveChoice('FREEZE')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    interactiveChoice === 'FREEZE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs uppercase font-mono tracking-wider text-emerald-700">1. FREEZE</div>
                  <div className="text-xs text-slate-600 mt-1">"I love this seat and do not want any further upgrades."</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractiveChoice('FLOAT')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    interactiveChoice === 'FLOAT'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs uppercase font-mono tracking-wider text-indigo-700">2. FLOAT</div>
                  <div className="text-xs text-slate-600 mt-1">"Accept seat, but upgrade to higher choice in ANY NIT in Round 2."</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractiveChoice('SLIDE')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    interactiveChoice === 'SLIDE'
                      ? 'border-purple-600 bg-purple-50 text-purple-950 ring-1 ring-purple-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs uppercase font-mono tracking-wider text-purple-700">3. SLIDE</div>
                  <div className="text-xs text-slate-600 mt-1">"Accept seat, but upgrade ONLY within this SAME NIT."</div>
                </button>
              </div>

              {/* Simulated Preference List Reaction */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                  Preference List Status under {interactiveChoice}:
                </div>

                {/* Choice 1 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  interactiveChoice === 'FLOAT' ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">#1</span>
                    <span className="font-semibold text-slate-900">NIT Trichy — Computer Science (CSE)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-700">
                    {interactiveChoice === 'FLOAT' ? 'Eligible for Round 2 upgrade' : 'Ineligible'}
                  </span>
                </div>

                {/* Choice 2 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  interactiveChoice === 'SLIDE' || interactiveChoice === 'FLOAT'
                    ? 'border-purple-300 bg-purple-50/50'
                    : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">#2</span>
                    <span className="font-semibold text-slate-900">NIT Warangal — Computer Science (CSE)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-700">
                    {interactiveChoice === 'FREEZE' ? 'Ineligible' : 'Eligible for Round 2 upgrade'}
                  </span>
                </div>

                {/* Choice 3 */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                  interactiveChoice === 'FLOAT' ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">#3</span>
                    <span className="font-semibold text-slate-900">NIT Surathkal — ECE</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-700">
                    {interactiveChoice === 'FLOAT' ? 'Eligible for Round 2 upgrade' : 'Ineligible (Different Institute)'}
                  </span>
                </div>

                {/* Choice 4 (Currently Allotted) */}
                <div className="p-2.5 rounded-lg border-2 border-emerald-500 bg-emerald-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-800">#4</span>
                    <span className="font-bold text-emerald-950">NIT Warangal — ECE (Current Allotment)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Retained Seat (Safe)
                  </span>
                </div>

                {/* Choice 5 (Below Allotment) */}
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-100/50 text-slate-400 flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2 line-through">
                    <span className="font-mono">#5</span>
                    <span>NIT Rourkela — Mechanical</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    Cancelled (Lower preference)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 50:50 HOME STATE VS OTHER STATE */}
        {activeTab === 'quotas' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="font-sans font-bold text-slate-900 text-sm">
              Understanding the 50% Home State (HS) vs. 50% Other State (OS) Quota
            </h3>
            <p>
              In all 31 National Institutes of Technology (NITs), 50% of the seats are strictly reserved for candidates whose <strong>State Code of Eligibility</strong> matches the State or Union Territory in which the NIT is located.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <span className="font-bold font-mono text-purple-900 block text-xs">Home State (HS) Quota (50%)</span>
                <p>
                  Available exclusively to students who passed Class XII from a school/junior college located in that specific state. Cutoffs for Home State seats are typically broader, providing a valuable safety net.
                </p>
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <span className="font-bold font-mono text-indigo-900 block text-xs">Other State (OS) Quota (50%)</span>
                <p>
                  Available to all students whose Class XII school is located outside that state. Students compete on an All-India merit basis with fiercely competitive cutoffs.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
              <strong>Example:</strong> A candidate who passed Class XII in Telangana gets <strong>Home State (HS)</strong> quota at NIT Warangal, but <strong>Other State (OS)</strong> quota at NIT Trichy, NIT Surathkal, and all other 30 NITs.
            </div>
          </div>
        )}

        {/* TAB 3: CHOICE FILLING STRATEGY */}
        {activeTab === 'preference' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="font-sans font-bold text-slate-900 text-sm">
              Golden Rules for Arranging JoSAA Choices
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Top-Down Order:</strong> JoSAA algorithms test choices starting from Preference #1 downwards. The moment your rank matches a choice, the system stops and all lower choices are cancelled.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Never Order by Cutoff Ranks:</strong> Order strictly by your personal career preference. Never place a lower-interest branch above your preferred branch simply because it has a "higher" closing cutoff.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Fill Ample Choices (40+ to 80+):</strong> There is no fee per choice and no penalty for filling many options. Include ambitious choices at the top, realistic choices in the middle, and reliable safety options at the bottom.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* TAB 4: POST-ALLOTMENT REPORTING STEPS */}
        {activeTab === 'overview' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="font-sans font-bold text-slate-900 text-sm">
              Mandatory Steps Once a Seat is Allocated in Any Round
            </h3>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="bg-indigo-600 text-white font-mono font-bold text-xs h-6 w-6 rounded flex items-center justify-center shrink-0">1</div>
                <div>
                  <span className="font-bold text-slate-900 block">Online Seat Acceptance</span>
                  <span>Log in to JoSAA portal and choose Freeze, Float, or Slide willingness.</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="bg-indigo-600 text-white font-mono font-bold text-xs h-6 w-6 rounded flex items-center justify-center shrink-0">2</div>
                <div>
                  <span className="font-bold text-slate-900 block">Payment of Seat Acceptance Fee (SAF)</span>
                  <span>Mandatory non-refundable fee payment within deadline. Failure to pay cancels the seat permanently.</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-3">
                <div className="bg-indigo-600 text-white font-mono font-bold text-xs h-6 w-6 rounded flex items-center justify-center shrink-0">3</div>
                <div>
                  <span className="font-bold text-slate-900 block">Document Verification</span>
                  <span>Upload Class X certificate, Class XII mark sheet, Category/PwD certificate, and Medical certificate. Respond to any verification queries promptly.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Got it, Return to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

