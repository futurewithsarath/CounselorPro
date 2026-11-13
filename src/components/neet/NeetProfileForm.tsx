import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  BookOpen, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  Stethoscope, 
  HeartPulse, 
  Landmark, 
  Info,
  Building2,
  Sparkles
} from 'lucide-react';
import { 
  NeetStudentProfile, 
  NeetCategory, 
  NeetCounsellingAuthority, 
  NeetCourseType 
} from '../../types';
import MotionButton from '../ui/MotionButton';

interface NeetProfileFormProps {
  profile: NeetStudentProfile;
  onChange: (profile: NeetStudentProfile) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenLearningCentre: () => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Uttar Pradesh',
  'Rajasthan',
  'Kerala',
  'Gujarat',
  'West Bengal',
  'Madhya Pradesh',
  'Bihar',
  'Punjab',
  'Haryana',
  'Odisha',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Puducherry',
  'Goa',
  'Other State / UT'
];

export default function NeetProfileForm({
  profile,
  onChange,
  onNext,
  onBack,
  onOpenLearningCentre
}: NeetProfileFormProps) {
  const [errorRank, setErrorRank] = useState<string | null>(null);
  const [errorScore, setErrorScore] = useState<string | null>(null);

  // Validate Class 12 PCB statutory requirement
  const minPcbRequired = profile.isPwd ? 45 : (['UR', 'EWS'].includes(profile.category) ? 50 : 40);
  const isPcbEligible = profile.pcbMarksPercentage >= minPcbRequired;

  const handleRankChange = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      setErrorRank('Please enter a valid All India Rank (e.g. 15420)');
      onChange({ ...profile, allIndiaRank: 0 });
    } else if (num > 2500000) {
      setErrorRank('NEET UG rank must be within 25,00,000');
      onChange({ ...profile, allIndiaRank: num });
    } else {
      setErrorRank(null);
      onChange({ ...profile, allIndiaRank: num });
    }
  };

  const handleScoreChange = (val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
      setErrorScore('Please enter a valid score (0 to 720)');
      onChange({ ...profile, neetScore: 0 });
    } else if (num > 720) {
      setErrorScore('NEET total maximum score is 720');
      onChange({ ...profile, neetScore: 720 });
    } else {
      setErrorScore(null);
      onChange({ ...profile, neetScore: num });
    }
  };

  const handleToggleCourse = (course: NeetCourseType) => {
    let nextCourses = [...profile.selectedCourses];
    if (nextCourses.includes(course)) {
      if (nextCourses.length > 1) {
        nextCourses = nextCourses.filter(c => c !== course);
      }
    } else {
      nextCourses.push(course);
    }
    onChange({ ...profile, selectedCourses: nextCourses });
  };

  const canProceed = profile.allIndiaRank > 0 && !errorRank && profile.selectedCourses.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="neet-profile-step">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Step 2 of 4 • NEET UG Profile
        </span>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          Enter Your NEET UG Score & Eligibility Profile
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
          Configure your NEET score, All India Rank (AIR), category, domicile, and PCB criteria. CounselorPro will automatically match you against official MCC, Dr. YSRUHS, KNRUHS, and AACCC AYUSH cutoff benchmarks.
        </p>

        <div className="mt-4 flex justify-center">
          <MotionButton
            variant="outline"
            size="sm"
            onClick={onOpenLearningCentre}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs"
            leftIcon={<BookOpen className="w-4 h-4 text-emerald-600" />}
          >
            Open NEET Counselling Rules Guide
          </MotionButton>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Row 1: AIR & NEET Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              NEET All India Rank (AIR / CRL) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="2500000"
                value={profile.allIndiaRank || ''}
                onChange={(e) => handleRankChange(e.target.value)}
                placeholder="e.g. 15420"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${
                  errorRank 
                    ? 'border-rose-400 focus:ring-rose-200' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400">AIR</span>
            </div>
            {errorRank && <p className="text-xs text-rose-600 mt-1">{errorRank}</p>}
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              NEET Score (Out of 720) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="720"
                value={profile.neetScore || ''}
                onChange={(e) => handleScoreChange(e.target.value)}
                placeholder="e.g. 625"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 ${
                  errorScore 
                    ? 'border-rose-400 focus:ring-rose-200' 
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400">/ 720</span>
            </div>
            {errorScore && <p className="text-xs text-rose-600 mt-1">{errorScore}</p>}
          </div>
        </div>

        {/* Row 2: Category, Gender, PwD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Category (MCC / Central) *
            </label>
            <select
              value={profile.category}
              onChange={(e) => onChange({ ...profile, category: e.target.value as NeetCategory })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="UR">UR (General / Open)</option>
              <option value="EWS">GEN-EWS</option>
              <option value="OBC">OBC-NCL</option>
              <option value="SC">Scheduled Caste (SC)</option>
              <option value="ST">Scheduled Tribe (ST)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Gender *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Male', 'Female'] as const).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => onChange({ ...profile, gender: g })}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    profile.gender === g
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Person with Disability (PwD)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map((val) => (
                <button
                  type="button"
                  key={String(val)}
                  onClick={() => onChange({ ...profile, isPwd: val })}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    profile.isPwd === val
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  {val ? 'Yes (5% Quota)' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Class 12 PCB Percentage & Statutory Eligibility */}
        <div className="border-t border-slate-100 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                Class 12th PCB Aggregate Marks (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="100"
                  step="0.1"
                  value={profile.pcbMarksPercentage || ''}
                  onChange={(e) => onChange({ ...profile, pcbMarksPercentage: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 75"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Physics + Chemistry + Biology (or Biotechnology) aggregate percentage.
              </p>
            </div>

            <div>
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isPcbEligible 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {isPcbEligible ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">
                    {isPcbEligible 
                      ? 'NMC Statutory Eligibility Verified' 
                      : 'Statutory PCB Marks Warning'}
                  </p>
                  <p className="mt-0.5">
                    {isPcbEligible ? (
                      `Your score of ${profile.pcbMarksPercentage}% meets the NMC statutory threshold of ${minPcbRequired}% for ${profile.category}${profile.isPwd ? ' PwD' : ''}.`
                    ) : (
                      `Minimum aggregate requirement for ${profile.category}${profile.isPwd ? ' PwD' : ''} is ${minPcbRequired}% (NMC UG Regulations).`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Domicile State & Local Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Domicile / State of Eligibility *
            </label>
            <select
              value={profile.domicileState}
              onChange={(e) => {
                const state = e.target.value;
                let defaultLocal = profile.localArea;
                if (state === 'Andhra Pradesh') defaultLocal = 'AU';
                else if (state === 'Telangana') defaultLocal = 'OU';
                else defaultLocal = 'NON_LOCAL';

                onChange({ 
                  ...profile, 
                  domicileState: state,
                  localArea: defaultLocal
                });
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Determines eligibility for AP Dr. YSRUHS or Telangana KNRUHS 85% State Quotas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
              Local University Region (AP & Telangana)
            </label>
            <select
              value={profile.localArea || 'NON_LOCAL'}
              onChange={(e) => onChange({ ...profile, localArea: e.target.value as any })}
              disabled={!['Andhra Pradesh', 'Telangana'].includes(profile.domicileState)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="AU">Andhra University Area (AU - AP)</option>
              <option value="SVU">Sri Venkateswara University Area (SVU - AP)</option>
              <option value="OU">Osmania University Area (OU - Telangana)</option>
              <option value="NON_LOCAL">Non-Local / Unreserved (15%)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Article 371-D local area allocation based on 4-year continuous study.
            </p>
          </div>
        </div>

        {/* Row 5: Course Preferences */}
        <div className="border-t border-slate-100 pt-5">
          <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-2">
            Target Medical & AYUSH Programmes *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { code: 'MBBS', name: 'MBBS', sub: 'Medicine & Surgery' },
              { code: 'BDS', name: 'BDS', sub: 'Dental Surgery' },
              { code: 'BAMS', name: 'BAMS', sub: 'Ayurveda' },
              { code: 'BHMS', name: 'BHMS', sub: 'Homoeopathy' },
              { code: 'BUMS', name: 'BUMS', sub: 'Unani Medicine' },
            ].map((course) => {
              const isSelected = profile.selectedCourses.includes(course.code as NeetCourseType);
              return (
                <button
                  type="button"
                  key={course.code}
                  onClick={() => handleToggleCourse(course.code as NeetCourseType)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">{course.code}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{course.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 6: Primary Authority Scope Filter */}
        <div className="border-t border-slate-100 pt-5">
          <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-2">
            Primary Counselling Pathway Focus
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { id: 'ALL', label: 'All Authorities', desc: 'Browse all MCC, States & AACCC' },
              { id: 'MCC', label: 'MCC (All India)', desc: '15% AIQ, AIIMS, JIPMER, Deemed' },
              { 
                id: profile.domicileState === 'Andhra Pradesh' ? 'AP_STATE' : 'TG_STATE', 
                label: profile.domicileState === 'Andhra Pradesh' ? 'Dr. YSRUHS (AP)' : 'KNRUHS (Telangana)', 
                desc: '85% State Quota & Private Colleges' 
              },
              { id: 'AACCC', label: 'AACCC (AYUSH)', desc: 'BAMS, BHMS, BUMS National Inst.' },
            ].map((item) => {
              const isSelected = profile.activeAuthority === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onChange({ ...profile, activeAuthority: item.id as any })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Button Controls */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <MotionButton
          variant="ghost"
          size="md"
          onClick={onBack}
        >
          Change Exam
        </MotionButton>

        <MotionButton
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          shimmer
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Proceed to Choice Filling
        </MotionButton>
      </div>
    </div>
  );
}
