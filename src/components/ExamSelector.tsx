import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExamType } from '../types';
import { ArrowRight, Landmark, GraduationCap, Cpu, FlaskConical, Building2, ShieldCheck, Check, Stethoscope } from 'lucide-react';
import MotionButton from './ui/MotionButton';

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {/* AP EAPCET Option Card */}
        <motion.div
          onClick={() => onSelect('AP_EAPCET')}
          id="select-ap-eapcet"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-colors flex flex-col justify-between min-h-[300px] relative overflow-hidden ${
            selectedExam === 'AP_EAPCET'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-lg shadow-emerald-600/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {selectedExam === 'AP_EAPCET' && (
            <motion.div 
              layoutId="activeExamGlow"
              className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <div className="space-y-3 relative z-10">
            <div className={`p-3 rounded-xl w-fit transition-colors ${selectedExam === 'AP_EAPCET' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}`}>
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 relative z-10">
            <span className="text-[11px] font-mono text-slate-500">REGIONS: AU, SVU</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all ${
              selectedExam === 'AP_EAPCET' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'AP_EAPCET' && <Check className="w-3.5 h-3.5" />}
              {selectedExam === 'AP_EAPCET' ? 'Selected' : 'Select'}
            </span>
          </div>
        </motion.div>

        {/* TS EAMCET Option Card */}
        <motion.div
          onClick={() => onSelect('TS_EAMCET')}
          id="select-ts-eamcet"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-colors flex flex-col justify-between min-h-[300px] relative overflow-hidden ${
            selectedExam === 'TS_EAMCET'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-lg shadow-emerald-600/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {selectedExam === 'TS_EAMCET' && (
            <motion.div 
              layoutId="activeExamGlow"
              className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <div className="space-y-3 relative z-10">
            <div className={`p-3 rounded-xl w-fit transition-colors ${selectedExam === 'TS_EAMCET' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}`}>
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 relative z-10">
            <span className="text-[11px] font-mono text-slate-500">REGION: OU</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all ${
              selectedExam === 'TS_EAMCET' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'TS_EAMCET' && <Check className="w-3.5 h-3.5" />}
              {selectedExam === 'TS_EAMCET' ? 'Selected' : 'Select'}
            </span>
          </div>
        </motion.div>

        {/* JEE Main JoSAA NIT Card */}
        <motion.div
          onClick={() => onSelect('JEE_MAIN')}
          id="select-jee-main"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-colors flex flex-col justify-between min-h-[300px] relative overflow-hidden ${
            selectedExam === 'JEE_MAIN'
              ? 'border-indigo-600 bg-indigo-50/40 shadow-lg shadow-indigo-600/10'
              : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
          }`}
        >
          {selectedExam === 'JEE_MAIN' && (
            <motion.div 
              layoutId="activeExamGlow"
              className="absolute inset-0 bg-indigo-500/5 pointer-events-none"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl w-fit transition-colors ${selectedExam === 'JEE_MAIN' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700'}`}>
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 relative z-10">
            <span className="text-[11px] font-mono text-slate-500">50% HS / 50% OS QUOTAS</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all ${
              selectedExam === 'JEE_MAIN' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'JEE_MAIN' && <Check className="w-3.5 h-3.5" />}
              {selectedExam === 'JEE_MAIN' ? 'Selected' : 'Select'}
            </span>
          </div>
        </motion.div>

        {/* NEET UG (Medical & AYUSH) Card */}
        <motion.div
          onClick={() => onSelect('NEET_UG')}
          id="select-neet-ug"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={`cursor-pointer group rounded-2xl p-5 border-2 transition-colors flex flex-col justify-between min-h-[300px] relative overflow-hidden ${
            selectedExam === 'NEET_UG'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-lg shadow-emerald-600/10'
              : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'
          }`}
        >
          {selectedExam === 'NEET_UG' && (
            <motion.div 
              layoutId="activeExamGlow"
              className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl w-fit transition-colors ${selectedExam === 'NEET_UG' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700'}`}>
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                MBBS / BDS / AYUSH
              </span>
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-slate-900">NEET UG (Medical)</h3>
              <p className="text-[11px] text-emerald-700 font-mono font-semibold mt-0.5">ALL INDIA & STATE COUNSELLING</p>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Medical & Dental options simulation across <strong>MCC (AIQ 15%, AIIMS, JIPMER, Deemed)</strong>, <strong>Dr. YSRUHS (AP 85%)</strong>, <strong>KNRUHS (Telangana 85%)</strong>, and <strong>AACCC (AYUSH)</strong>.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 relative z-10">
            <span className="text-[11px] font-mono text-slate-500">MCC • STATES • AACCC</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all ${
              selectedExam === 'NEET_UG' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
            }`}>
              {selectedExam === 'NEET_UG' && <Check className="w-3.5 h-3.5" />}
              {selectedExam === 'NEET_UG' ? 'Selected' : 'Select'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Stream Selection for State Exams */}
      <AnimatePresence>
        {selectedExam && !['JEE_MAIN', 'NEET_UG'].includes(selectedExam) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
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
              <motion.div
                onClick={() => onSelectStream('MPC')}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 relative overflow-hidden ${
                  selectedStream === 'MPC'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {selectedStream === 'MPC' && (
                  <motion.div
                    layoutId="activeStreamIndicator"
                    className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <div className={`p-2.5 rounded-lg transition-colors ${selectedStream === 'MPC' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="text-left relative z-10">
                  <h4 className="font-sans font-bold text-xs text-slate-900">MPC Stream (Engineering)</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">CSE, ECE, EEE, MECH, CIVIL, INF & IT branches</p>
                </div>
              </motion.div>

              {/* BiPC Option */}
              <motion.div
                onClick={() => onSelectStream('BiPC')}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 relative overflow-hidden ${
                  selectedStream === 'BiPC'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {selectedStream === 'BiPC' && (
                  <motion.div
                    layoutId="activeStreamIndicator"
                    className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <div className={`p-2.5 rounded-lg transition-colors ${selectedStream === 'BiPC' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div className="text-left relative z-10">
                  <h4 className="font-sans font-bold text-xs text-slate-900">BiPC Stream (Agri, Pharma, Bio)</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Agriculture, Pharmacy, Bio-Tech & Pharma-D branches</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track info for JEE Main */}
      <AnimatePresence>
        {selectedExam === 'JEE_MAIN' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 bg-indigo-50/60 border border-indigo-200 rounded-2xl p-6 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5 shadow-xs">
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

        {/* Track info for NEET UG */}
        {selectedExam === 'NEET_UG' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-emerald-950 text-sm">
                  Academic Track: NEET UG Medical & Dental Admissions (MBBS, BDS, AYUSH)
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  You are entering the <strong>NEET UG Multi-Authority Counselling Practice Workspace</strong>. Practice option sequencing across <strong>MCC (15% AIQ, AIIMS, JIPMER, Deemed)</strong>, <strong>Dr. YSRUHS (AP 85% CQ & MQ)</strong>, <strong>KNRUHS (Telangana 85% CQ & MQ)</strong>, and <strong>AACCC (AYUSH Central AIQ)</strong> with authentic 2024 cutoff benchmarks.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
                    MCC: 15% AIQ & AIIMS
                  </span>
                  <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
                    AP & Telangana State Quotas
                  </span>
                  <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
                    AACCC: BAMS, BHMS, BUMS
                  </span>
                  <span className="bg-white/80 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-md">
                    PCB Marks Eligibility Checks
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button Controls */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-200 pt-6">
        <MotionButton
          variant="ghost"
          size="md"
          onClick={onBack}
        >
          Back to Start
        </MotionButton>

        <MotionButton
          variant="primary"
          size="lg"
          onClick={onNext}
          disabled={!selectedExam}
          id="exam-next-btn"
          shimmer
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Details
        </MotionButton>
      </div>
    </div>
  );
}
