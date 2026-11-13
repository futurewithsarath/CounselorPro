import React from 'react';
import { motion } from 'motion/react';
import { ExamType } from '../types';
import { ArrowRight, Landmark, GraduationCap, Cpu, FlaskConical, Building2, ShieldCheck } from 'lucide-react';

interface ExamSelectorProps {
  selectedExam: ExamType | null;
  selectedStream: 'MPC' | 'BiPC';
  onSelect: (exam: ExamType) => void;
  onSelectStream: (stream: 'MPC' | 'BiPC') => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ExamSelector({ 
  selectedExam, 
  selectedStream,
  onSelect, 
  onSelectStream,
  onNext, 
  onBack 
}: ExamSelectorProps) {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4" id="exam-selector-step">
      <div className="text-center mb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Step 1 of 4
        </span>
        <h2 className="font-sans font-bold text-3xl text-slate-900 mt-3 tracking-tight">
          Select Your Counselling Exam & Stream
        </h2>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
          Choose your entrance examination. For state exams (AP & TG EAPCET), practice cutoff-based option entry. For JEE Main, practice simulated JoSAA NIT choice-filling and preference ordering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        {/* AP EAPCET Option Card */}
        <div
          onClick={() => onSelect('AP_EAPCET')}
          id="select-ap-eapcet"
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] ${
            selectedExam === 'AP_EAPCET'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-1 ring-emerald-600'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="space-y-3">
            <div className={`p-3 rounded-xl w-fit ${selectedExam === 'AP_EAPCET' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-slate-900">AP EAPCET</h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">ANDHRA PRADESH COUNSELLING</p>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Andhra Pradesh State common entrance test. Includes top state institutions like <strong>AU College of Engineering</strong>, <strong>JNTU Kakinada</strong>, <strong>JNTU Anantapur</strong>, and autonomous colleges.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-[11px] font-mono text-slate-500">REGIONS: AU, SVU</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              selectedExam === 'AP_EAPCET' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'AP_EAPCET' ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>

        {/* TS EAMCET Option Card */}
        <div
          onClick={() => onSelect('TS_EAMCET')}
          id="select-ts-eamcet"
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] ${
            selectedExam === 'TS_EAMCET'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-1 ring-emerald-600'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="space-y-3">
            <div className={`p-3 rounded-xl w-fit ${selectedExam === 'TS_EAMCET' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-slate-900">TG EAPCET</h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">TELANGANA STATE COUNSELLING</p>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Telangana State engineering & agriculture counselling. Includes premier options like <strong>JNTU Hyderabad</strong>, <strong>OUCE</strong>, <strong>CBIT</strong>, <strong>Vasavi</strong>, and <strong>VNR VJIET</strong>.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-[11px] font-mono text-slate-500">REGION: OU</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              selectedExam === 'TS_EAMCET' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'TS_EAMCET' ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>

        {/* JEE Main JoSAA NIT Card */}
        <div
          onClick={() => onSelect('JEE_MAIN')}
          id="select-jee-main"
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] relative ${
            selectedExam === 'JEE_MAIN'
              ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-1 ring-indigo-600'
              : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl w-fit ${selectedExam === 'JEE_MAIN' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                PRACTICE ONLY
              </span>
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-slate-900">JEE Main (JoSAA)</h3>
              <p className="text-[11px] text-indigo-600 font-mono font-semibold mt-0.5">31 NITs COUNSELLING PRACTICE</p>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Joint Seat Allocation Authority simulation for all <strong>31 National Institutes of Technology</strong> (NIT Trichy, Surathkal, Warangal, Calicut, etc.). Practice choice order, HS/OS quotas & learn seat rules.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-[11px] font-mono text-slate-500">50% HS / 50% OS QUOTAS</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              selectedExam === 'JEE_MAIN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'JEE_MAIN' ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>
      </div>

      {/* Stream Selection for State Exams */}
      {selectedExam && selectedExam !== 'JEE_MAIN' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs"
        >
          <div className="text-center mb-5">
            <h3 className="font-sans font-bold text-slate-900 text-base">
              Select Your Academic Stream
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your high school stream to unlock eligible seat branches and accurate cutoff profiles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MPC Option */}
            <div
              onClick={() => onSelectStream('MPC')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedStream === 'MPC'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${selectedStream === 'MPC' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-sans font-bold text-xs text-slate-900">MPC Stream (Engineering)</h4>
                <p className="text-[10px] text-slate-500 leading-tight">CSE, ECE, EEE, MECH, CIVIL, INF & IT branches</p>
              </div>
            </div>

            {/* BiPC Option */}
            <div
              onClick={() => onSelectStream('BiPC')}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedStream === 'BiPC'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white shadow-3xs'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${selectedStream === 'BiPC' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="font-sans font-bold text-xs text-slate-900">BiPC Stream (Agri, Pharma, Bio)</h4>
                <p className="text-[10px] text-slate-500 leading-tight">Agriculture, Pharmacy, Bio-Tech & Pharma-D branches</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Track info for JEE Main */}
      {selectedExam === 'JEE_MAIN' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-indigo-50/60 border border-indigo-200 rounded-2xl p-6 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-indigo-950 text-sm">
                Academic Track: JEE Main Paper 1 — B.E. / B.Tech (4-Year Undergrad)
              </h4>
              <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                You are entering the <strong>NIT JoSAA Choice-Filling Practice Module</strong>. This environment lets you simulate genuine preference ordering across all 31 National Institutes of Technology. 
                In accordance with JoSAA Business Rules, your Class XII state determines 50% Home State quota eligibility.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="bg-white/80 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md">
                  Scope: 31 NITs
                </span>
                <span className="bg-white/80 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md">
                  Practice Choice Locking & PDF Export
                </span>
                <span className="bg-white/80 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-md">
                  Interactive Freeze / Float / Slide Guide
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Button Controls */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all font-medium cursor-pointer text-xs"
        >
          Back to Start
        </button>
        <button
          onClick={onNext}
          disabled={!selectedExam}
          id="exam-next-btn"
          className={`px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs ${
            !selectedExam ? 'opacity-50 cursor-not-allowed bg-slate-300 shadow-none hover:bg-slate-300' : ''
          }`}
        >
          Continue to Details
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
