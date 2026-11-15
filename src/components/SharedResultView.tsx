import React from 'react';
import { 
  Building, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Award, 
  Download, 
  ExternalLink,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { SocialCardData, downloadSocialCard } from '../utils/socialCardGenerator';
import MotionButton from './ui/MotionButton';

export interface SharedResultViewProps {
  data: SocialCardData;
  onNavigateHome: () => void;
}

export default function SharedResultView({ data, onNavigateHome }: SharedResultViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 cursor-pointer mb-1 select-none" onClick={onNavigateHome}>
            <img src="/logo.png" alt="CounselorPro" className="w-8 h-8 object-contain rounded-xl drop-shadow-xs" />
            <span className="font-sans font-black text-2xl tracking-tight text-slate-900">
              Counselor<span className="text-emerald-600">Pro</span>
            </span>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>COUNSELORPRO VERIFIED SIMULATION RESULT</span>
            </div>
          </div>
          <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Counselling Practice Result
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Generated using official historical cutoff datasets on CounselorPro.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Exam & Status Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Examination</span>
              <h2 className="font-sans font-bold text-xl text-slate-900">{data.exam.replace('_', ' ')}</h2>
              <span className="text-xs text-slate-500 font-mono">{data.stream || 'General'} Stream</span>
            </div>
            <div className="px-3 py-1 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold font-mono">
              MOCK RESULT • PRACTICE ONLY
            </div>
          </div>

          {/* Student Stats Badges (Privacy respected) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase">Candidate Rank</span>
              <strong className="text-slate-900 text-sm">
                {data.includeRank && data.rank ? `#${Number(data.rank).toLocaleString()}` : 'Protected'}
              </strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block uppercase">Category</span>
              <strong className="text-slate-900 text-sm">
                {data.includeCategory && data.category ? data.category : 'Merit'}
              </strong>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 block uppercase">Choices Prioritized</span>
              <strong className="text-emerald-700 text-sm">{data.totalChoices} Colleges</strong>
            </div>
          </div>

          {/* Allotment Outcome */}
          {data.allotted && data.collegeName ? (
            <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                  <Building className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 block tracking-wider">
                    ★ Historical Cutoff Match
                  </span>
                  <h3 className="font-sans font-black text-slate-900 text-lg leading-snug">
                    {data.collegeName}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-600">
                    <span>Code: <strong className="text-slate-900">{data.collegeCode || 'UNKN'}</strong></span>
                    <span>•</span>
                    <span>Preference: <strong className="text-emerald-700 font-bold">Choice #{data.preferenceNumber || 1}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">Branch: <strong className="text-slate-900">{data.branchName}</strong></span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  {data.probabilityRange || 'HIGH'} Cutoff Range
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
              <h3 className="font-bold text-slate-800 text-base">Completed Counselling Simulation</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Practiced ordering preferences against historical closing ranks to avoid option entry errors.
              </p>
            </div>
          )}

          {/* Social Media Card Export Buttons */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-mono text-slate-300">Save Branded Result Graphic:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => downloadSocialCard(data, 'story')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Story (9:16)</span>
              </button>
              <button
                onClick={() => downloadSocialCard(data, 'square')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Square (1:1)</span>
              </button>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex gap-2.5 items-start">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Admissions Safety Notice:</strong> This educational result was generated on CounselorPro by comparing candidate choices with official previous-year closing ranks. It is not an official seat allotment or guarantee of admission.
            </p>
          </div>

          {/* Call to action for the friend viewing the result */}
          <div className="pt-2 text-center">
            <button
              onClick={onNavigateHome}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <GraduationCap className="w-5 h-5" />
              <span>Practice Your Own Counselling Choices Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 font-mono">
          CounselorPro Admissions Intelligence • counselorpro.in
        </p>

      </div>
    </div>
  );
}
