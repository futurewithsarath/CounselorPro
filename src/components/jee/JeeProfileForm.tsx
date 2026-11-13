import React, { useState } from 'react';
import { JeeStudentProfile, JeePracticeMode, JeeCategory } from '../../types';
import { INDIAN_STATES_UTS, ALL_NITS, determineNitQuota } from '../../data/jeeNitCatalog';
import { ArrowLeft, ArrowRight, UserCircle, Trophy, HelpCircle, Sparkles, Building2, ShieldAlert } from 'lucide-react';

interface JeeProfileFormProps {
  profile: JeeStudentProfile;
  onChange: (updated: JeeStudentProfile) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenLearningCentre?: () => void;
}

export default function JeeProfileForm({
  profile,
  onChange,
  onNext,
  onBack,
  onOpenLearningCentre
}: JeeProfileFormProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const homeNit = ALL_NITS.find(nit => nit.state.toLowerCase() === profile.stateOfEligibility.toLowerCase());

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!profile.stateOfEligibility) {
      errs.state = 'Please select your Class XII State Code of Eligibility.';
    }

    if (profile.practiceMode === 'PROFILE_BASED') {
      if (profile.crlRank !== undefined && profile.crlRank !== null) {
        if (profile.crlRank <= 0 || isNaN(profile.crlRank)) {
          errs.crlRank = 'CRL Rank must be a positive integer.';
        } else if (profile.crlRank > 1500000) {
          errs.crlRank = 'Please enter a realistic rank below 1,500,000.';
        }
      }
      if (profile.categoryRank !== undefined && profile.categoryRank !== null) {
        if (profile.categoryRank <= 0 || isNaN(profile.categoryRank)) {
          errs.categoryRank = 'Category Rank must be a positive integer.';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextClick = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4" id="jee-profile-step">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>JoSAA NIT Counselling Practice • Step 2 of 4</span>
        </div>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          JEE Main Profile & Eligibility
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-xl mx-auto">
          Configure your state of eligibility and preferences to experience realistic Home State (HS) vs. Other State (OS) NIT choice filling.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Practice Mode Toggle */}
        <div className="border-b border-slate-100 pb-5">
          <label className="block text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
            Select Practice Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...profile, practiceMode: 'GUIDED' })}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                profile.practiceMode === 'GUIDED'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">Guided Practice (No Rank Needed)</span>
                {profile.practiceMode === 'GUIDED' && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Explore all 31 NITs, build preferences, and learn the choice-locking process freely without entering rank numbers.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...profile, practiceMode: 'PROFILE_BASED' })}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                profile.practiceMode === 'PROFILE_BASED'
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">Profile-Based Practice (With Rank)</span>
                {profile.practiceMode === 'PROFILE_BASED' && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Input your CRL / Category rank for personalised context during preference ordering.
              </p>
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <UserCircle className="w-5 h-5 text-indigo-600" />
            <span>Candidate Eligibility Details</span>
          </div>
          {onOpenLearningCentre && (
            <button
              type="button"
              onClick={onOpenLearningCentre}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>JoSAA Rules Guide</span>
            </button>
          )}
        </div>

        {/* State Code of Eligibility (Most Critical JoSAA Rule) */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-grow">
              <label htmlFor="state-eligibility" className="block text-sm font-bold text-slate-900">
                Class XII State Code of Eligibility
              </label>
              <p className="text-xs text-slate-600 leading-relaxed">
                Per official JoSAA Business Rules, your state code is determined <strong>strictly by the State/UT where you passed your Class XII qualifying exam</strong>, not by residence or birth.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <select
              id="state-eligibility"
              value={profile.stateOfEligibility}
              onChange={(e) => onChange({ ...profile, stateOfEligibility: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 font-medium text-sm bg-white ${
                errors.state ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-600/20 focus:border-indigo-600'
              }`}
            >
              {INDIAN_STATES_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {errors.state && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.state}</p>}
          </div>

          {/* Automatic Quota Indicator */}
          <div className="mt-3 pt-3 border-t border-indigo-100 text-xs flex items-center justify-between flex-wrap gap-2">
            <span className="text-slate-600">
              Home State (HS) 50% Quota Institute:
            </span>
            <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded border border-indigo-200">
              {homeNit ? `${homeNit.shortName} (${homeNit.state})` : 'Special UT / Shared Quota Allocation'}
            </span>
          </div>
        </div>

        {/* 3-Column Profile Form: Gender, Category, PwD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Gender */}
          <div className="space-y-1.5">
            <label htmlFor="jee-gender" className="block text-sm font-semibold text-slate-800">
              Candidate Gender
            </label>
            <select
              id="jee-gender"
              value={profile.gender}
              onChange={(e) => onChange({ ...profile, gender: e.target.value as 'Male' | 'Female' })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-white text-sm"
            >
              <option value="Male">Male (Gender-Neutral Pool)</option>
              <option value="Female">Female (Female Supernumerary Pool)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Females are considered for both Female-Only & Neutral pools.
            </p>
          </div>

          {/* Social Category */}
          <div className="space-y-1.5">
            <label htmlFor="jee-category" className="block text-sm font-semibold text-slate-800">
              Reservation Category
            </label>
            <select
              id="jee-category"
              value={profile.category}
              onChange={(e) => onChange({ ...profile, category: e.target.value as JeeCategory })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-white text-sm"
            >
              <option value="OPEN">OPEN (General / Unreserved)</option>
              <option value="GEN-EWS">GEN-EWS (Economically Weaker Section)</option>
              <option value="OBC-NCL">OBC-NCL (Other Backward Classes - Central List)</option>
              <option value="SC">SC (Scheduled Caste)</option>
              <option value="ST">ST (Scheduled Tribe)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Valid Central List certificate required at reporting.
            </p>
          </div>

          {/* PwD Status */}
          <div className="space-y-1.5">
            <label htmlFor="jee-pwd" className="block text-sm font-semibold text-slate-800">
              Persons with Disability (PwD)
            </label>
            <select
              id="jee-pwd"
              value={profile.isPwd ? 'YES' : 'NO'}
              onChange={(e) => onChange({ ...profile, isPwd: e.target.value === 'YES' })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-white text-sm"
            >
              <option value="NO">No (Non-PwD)</option>
              <option value="YES">Yes (≥40% Benchmark Disability)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              5% horizontal reservation within each category.
            </p>
          </div>
        </div>

        {/* Optional Rank Inputs (When in Profile-Based Mode) */}
        {profile.practiceMode === 'PROFILE_BASED' && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-3">
              JEE Main Paper 1 Ranks (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="crl-rank" className="block text-sm font-semibold text-slate-800">
                  Common Rank List (CRL Rank)
                </label>
                <div className="relative">
                  <input
                    id="crl-rank"
                    type="number"
                    value={profile.crlRank || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      onChange({ ...profile, crlRank: val });
                    }}
                    placeholder="e.g. 14250"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-mono text-sm"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
                {errors.crlRank && <p className="text-red-600 text-xs font-semibold">{errors.crlRank}</p>}
              </div>

              {profile.category !== 'OPEN' && (
                <div className="space-y-1.5">
                  <label htmlFor="cat-rank" className="block text-sm font-semibold text-slate-800">
                    {profile.category} Category Rank
                  </label>
                  <input
                    id="cat-rank"
                    type="number"
                    value={profile.categoryRank || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      onChange({ ...profile, categoryRank: val });
                    }}
                    placeholder="e.g. 3200"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-mono text-sm"
                  />
                  {errors.categoryRank && <p className="text-red-600 text-xs font-semibold">{errors.categoryRank}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Practice Notice */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 text-xs text-slate-600">
          <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold text-slate-900 block">JoSAA Counselling Practice Environment</span>
            <p>
              This is a hands-on learning workspace to help you explore the 31 NITs and practice ordering choices before official registration. CounselorPro does NOT submit your choices to JoSAA and does NOT make speculative seat promises.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all font-medium flex items-center gap-2 cursor-pointer text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exam Selection
        </button>
        <button
          type="button"
          onClick={handleNextClick}
          id="jee-proceed-btn"
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer text-sm"
        >
          Enter Choice-Filling Workspace
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

