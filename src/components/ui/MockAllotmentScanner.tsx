import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, Database, Award } from 'lucide-react';

interface MockAllotmentScannerProps {
  onScanComplete: () => void;
  examName?: string;
  categoryName?: string;
  rankNumber?: number;
  key?: React.Key;
}

export default function MockAllotmentScanner({
  onScanComplete,
  examName = 'EAPCET',
  categoryName = 'OC',
  rankNumber = 15000
}: MockAllotmentScannerProps) {
  const [scanStep, setScanStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(10);

  const scanSteps = [
    { text: `Scanning ${examName} verified government cutoff benchmarks...`, icon: Database },
    { text: `Evaluating rank #${rankNumber.toLocaleString()} in category ${categoryName}...`, icon: ShieldCheck },
    { text: 'Analyzing choice priority ordering sequence...', icon: Sparkles },
    { text: 'Mock allotment finalized!', icon: Award }
  ];

  useEffect(() => {
    // Step 0: 0-350ms
    const t1 = setTimeout(() => {
      setScanStep(1);
      setProgress(45);
    }, 380);

    // Step 1: 350-750ms
    const t2 = setTimeout(() => {
      setScanStep(2);
      setProgress(80);
    }, 750);

    // Step 2: 750-1150ms
    const t3 = setTimeout(() => {
      setScanStep(3);
      setProgress(100);
    }, 1100);

    // Complete at 1250ms
    const t4 = setTimeout(() => {
      onScanComplete();
    }, 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onScanComplete]);

  const CurrentIcon = scanSteps[scanStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 space-y-4 max-w-xl mx-auto overflow-hidden relative"
    >
      {/* Background glow pulse */}
      <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
            <CurrentIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-white">Simulating Mock Seat Allocation</h4>
            <p className="text-[11px] font-mono text-emerald-400">STATE COUNSELLING ENGINE v2.5</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
          {progress}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
          initial={{ width: '10%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* Dynamic Status Text */}
      <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
        <AnimatePresence mode="wait">
          <motion.span
            key={scanStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="truncate"
          >
            {scanSteps[scanStep].text}
          </motion.span>
        </AnimatePresence>
        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">Evaluating 1 → N</span>
      </div>
    </motion.div>
  );
}
