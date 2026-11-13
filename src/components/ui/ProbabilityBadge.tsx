import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ProbabilityMeta } from '../../data/colleges';
import { Sparkles, Info } from 'lucide-react';

interface ProbabilityBadgeProps {
  meta: ProbabilityMeta;
  showTooltip?: boolean;
  className?: string;
}

export default function ProbabilityBadge({ meta, showTooltip = true, className = '' }: ProbabilityBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Tier specific indicator dot
  const dotColor = {
    HIGH: 'bg-emerald-500',
    MODERATE: 'bg-teal-500',
    REACH: 'bg-amber-500',
    LOW: 'bg-rose-500',
    NO_DATA: 'bg-slate-400'
  }[meta.tier] || 'bg-slate-400';

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.04, y: -1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`inline-flex items-center gap-1 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded border select-none cursor-help ${meta.color} ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0 animate-pulse`} />
        <span>{meta.badgeLabel}</span>
      </motion.span>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-52 p-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-xl border border-slate-700 pointer-events-none text-left"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{meta.label}</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-snug">
              {meta.description}
            </p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[8px] font-mono text-slate-400">
              Evaluated against historical category cutoff
            </div>
            {/* Tooltip triangle tail */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
