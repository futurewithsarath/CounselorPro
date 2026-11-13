import React, { useState } from 'react';
import { StudentProfile, ExamType } from '../types';
import { hasLocalAreaCutoffs } from '../data/colleges';
import { ArrowLeft, ArrowRight, UserCircle, Trophy, HelpCircle } from 'lucide-react';

interface ProfileFormProps {
  exam: ExamType;
  profile: StudentProfile;
  onChange: (updated: StudentProfile) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ProfileForm({ exam, profile, onChange, onNext, onBack }: ProfileFormProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const newErrors = { ...errors };
    
    if (rawVal === '') {
      newErrors.rank = 'Rank cannot be empty. Please enter a valid rank.';
      setErrors(newErrors);
      onChange({ ...profile, rank: 0 });
      return;
    }
    
    // Check for negative or non-numeric characters (decimals, sign characters, scientific notation)
    if (!/^\d+$/.test(rawVal)) {
      newErrors.rank = 'Rank must be a numeric value containing digits only. Decimals, sign symbols, or letters are not allowed.';
      setErrors(newErrors);
      return;
    }
    
    const parsed = parseInt(rawVal, 10);
    
    if (parsed <= 0) {
      newErrors.rank = 'Rank must be a positive integer greater than 0.';
      setErrors(newErrors);
      onChange({ ...profile, rank: parsed });
      return;
    }
    
    if (parsed > 200000) {
      newErrors.rank = 'Please enter a rank below 200,000.';
      setErrors(newErrors);
      onChange({ ...profile, rank: parsed });
      return;
    }
    
    // Clear rank error if valid
    delete newErrors.rank;
    setErrors(newErrors);
    onChange({ ...profile, rank: parsed });
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (profile.rank <= 0 || isNaN(profile.rank)) {
      tempErrors.rank = 'Rank must be a positive number greater than 0.';
    } else if (profile.rank > 200000) {
      tempErrors.rank = 'Please enter a rank below 200,000.';
    }
    if (profile.stream === 'MPC' && profile.category === 'SC') {
      tempErrors.category = 'Choose SC-I, SC-II, or SC-III as shown on your certificate to match the MPC cutoff table.';
    } else if (profile.stream === 'BiPC' && ['SC-I', 'SC-II', 'SC-III'].includes(profile.category)) {
      tempErrors.category = 'This BiPC source reports one SC category. Select SC.';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validate()) {
      onNext();
    }
  };

  const getRankGuidance = (rank: number) => {
    if (rank <= 0) return null;
    if (rank <= 2000) {
      return {
        tier: "Excellent Merit (Tier 1)",
        color: "text-emerald-700 bg-emerald-50 border border-emerald-200",
        advice: "Compare this rank with the reported historical cutoffs for your selected stream."
      };
    }
    if (rank <= 10000) {
      return {
        tier: "High Merit (Tier 2)",
        color: "text-teal-700 bg-teal-50 border border-teal-200",
        advice: "Use the historical cutoff list to compare this rank with each college, branch, category, gender, and local-area combination."
      };
    }
    if (rank <= 25000) {
      return {
        tier: "Above Average (Tier 3)",
        color: "text-amber-700 bg-amber-50 border border-amber-200",
        advice: "Compare your rank with the reported historical cutoffs, then include a balanced range of colleges and branches in your practice list."
      };
    }
    return {
      tier: "General Cutoff Band (Tier 4)",
      color: "text-slate-700 bg-slate-50 border border-slate-200",
      advice: "Satisfactory rank. To guarantee seat allotment, you should choose a larger list of options (15+), including multiple branches like ECE, INF, or EEE across different colleges."
    };
  };

  const rankFeedback = getRankGuidance(profile.rank);

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-8 px-4" id="profile-details-step">
      <div className="text-center mb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Step 2 of 4
        </span>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          Enter Your Profile Details
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          Enter your rank and eligibility details. CounselorPro compares them with historical cutoffs for your selected exam and stream.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg border-b border-slate-100 pb-3 mb-2">
          <UserCircle className="w-5 h-5 text-emerald-600" />
          <span>Student Rank Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Rank */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-800">
              Exam Rank Obtained
            </label>
            <div className="relative">
              <input
                type="number"
                value={profile.rank || ''}
                onChange={handleRankChange}
                id="rank-input"
                placeholder="E.g., 4250"
                min="1"
                max="200000"
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 font-mono text-sm ${
                  errors.rank 
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50/10' 
                    : 'border-slate-300 focus:ring-emerald-600/20 focus:border-emerald-600'
                }`}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            {errors.rank && (
              <p className="text-red-600 text-xs font-semibold font-mono flex items-center gap-1">
                ⚠️ {errors.rank}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Gender Selector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Gender</label>
            <select
              value={profile.gender}
              onChange={(e) => onChange({ ...profile, gender: e.target.value as 'Male' | 'Female' })}
              id="gender-select"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 bg-white text-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Reservation Category */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Category</label>
            <select
              value={profile.category}
              onChange={(e) => onChange({ ...profile, category: e.target.value as any })}
              id="category-select"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 bg-white text-sm"
            >
              <option value="OC">OC (Open Competition)</option>
              <option value="BC-A">BC-A (Backward Class A)</option>
              <option value="BC-B">BC-B (Backward Class B)</option>
              <option value="BC-C">BC-C (Backward Class C)</option>
              <option value="BC-D">BC-D (Backward Class D)</option>
              <option value="BC-E">BC-E (Backward Class E)</option>
              {profile.stream === 'BiPC' ? (
                <option value="SC">SC (Scheduled Caste)</option>
              ) : (
                <>
                  {profile.category === 'SC' && <option value="SC" disabled>SC (choose your certificate subcategory)</option>}
                  <option value="SC-I">SC-I</option>
                  <option value="SC-II">SC-II</option>
                  <option value="SC-III">SC-III</option>
                </>
              )}
              <option value="ST">ST (Scheduled Tribe)</option>
              <option value="EWS">EWS (OC-EWS)</option>
            </select>
            {errors.category && <p className="text-red-600 text-xs font-semibold">{errors.category}</p>}
          </div>

          {/* Local University Region */}
          {hasLocalAreaCutoffs(exam) ? <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Local University Region
            </label>
            <select
              value={profile.region}
              onChange={(e) => onChange({ ...profile, region: e.target.value as any })}
              id="region-select"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 bg-white text-sm"
            >
              {exam === 'AP_EAPCET' ? (
                <>
                  <option value="AU">AU (Andhra University Region)</option>
                  <option value="SVU">SVU (Sri Venkateswara University Region)</option>
                </>
              ) : (
                <option value="OU">OU (Osmania University Region)</option>
              )}
            </select>
          </div> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 self-end">
            This historical source does not separate cutoff ranks by local area.
          </div>}
        </div>

        {/* Dynamic Rank Guidance Panel */}
        {rankFeedback && (
          <div className={`p-4 rounded-xl space-y-1 transition-all ${rankFeedback.color}`}>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>Rank Status: {rankFeedback.tier}</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{rankFeedback.advice}</p>
          </div>
        )}

        {/* Reservation quota notice */}
        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-xs text-amber-800">
          <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold block">How Reservation Categories Affect Your Allotment</span>
            <p>
              {exam === 'TS_EAMCET'
                ? 'The official TG EAPCET 2025 first-phase source separates SC-I, SC-II, and SC-III and reports cutoffs by gender without a local-area split. Girls are eligible for boys seats.'
                : profile.stream === 'MPC'
                  ? 'The AP EAPCET 2025 MPC source separates SC-I, SC-II, and SC-III. For girls, the simulator also checks the boys cutoff because girls are eligible for boys seats.'
                  : 'The AP EAPCET 2024 BiPC source reports one SC category and includes annual fees. For girls, the simulator also checks the boys cutoff because girls are eligible for boys seats.'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all font-medium flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleNextClick}
          id="profile-next-btn"
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          Proceed to College Selection
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
