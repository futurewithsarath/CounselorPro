import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'      // Emerald Green (#009E60) brand CTA
  | 'secondary'    // Mint/White surface with subtle slate/emerald border
  | 'indigo'       // JEE JoSAA theme
  | 'outline'      // Border outline
  | 'ghost'        // Subtle hover
  | 'danger';      // Destructive / red

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  shimmer?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export default function MotionButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  shimmer = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  onClick,
  type = 'button',
  ...props
}: MotionButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  const [rippleKey, setRippleKey] = useState<number>(0);
  const isDisabled = disabled || isLoading;

  // Base styling for all buttons
  const baseStyles = 'relative inline-flex items-center justify-center font-sans font-semibold rounded-xl select-none cursor-pointer overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  // Variant palette mappings matching brand (#009E60 Emerald, #047857 Deep Emerald, #0B132B Slate Navy)
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 focus-visible:ring-emerald-600 border border-emerald-500/20',
    secondary: 'bg-white hover:bg-emerald-50/60 active:bg-emerald-100/60 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-xs focus-visible:ring-emerald-500',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/20 focus-visible:ring-indigo-600 border border-indigo-500/20',
    outline: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 focus-visible:ring-slate-400',
    ghost: 'bg-transparent hover:bg-slate-100/80 active:bg-slate-200 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-600/20 focus-visible:ring-red-600 border border-red-500/20',
  };

  // Size specifications with touch target accessibility
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-5 py-2.5 gap-2 min-h-[42px]',
    lg: 'text-base px-7 py-3.5 gap-2.5 min-h-[50px]',
    icon: 'p-2 min-h-[38px] min-w-[38px]',
  };

  const disabledStyles = isDisabled 
    ? 'opacity-55 cursor-not-allowed pointer-events-none shadow-none filter grayscale-[20%]' 
    : '';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    setRippleKey(prev => prev + 1);
    if (onClick) onClick(e);
  };

  // Spring physics per design specification
  const springConfig = {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
    mass: 0.8
  };

  const shouldShimmer = (shimmer || variant === 'primary') && !isDisabled && !prefersReducedMotion;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      whileHover={prefersReducedMotion || isDisabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={prefersReducedMotion || isDisabled ? undefined : { scale: 0.95 }}
      transition={springConfig}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      {...props as any}
    >
      {/* Light-sweep Shimmer Animation */}
      {shouldShimmer && (
        <span 
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full group-hover:animate-shimmer pointer-events-none overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent)',
            width: '100%',
            height: '100%'
          }}
        />
      )}

      {/* Click ripple glow pulse */}
      <AnimatePresence>
        {rippleKey > 0 && !prefersReducedMotion && (
          <motion.span
            key={rippleKey}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-white/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Button Content with Animated Loading Morph */}
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>{loadingText || 'Loading...'}</span>
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center justify-center gap-2 w-full"
          >
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
