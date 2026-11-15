import React from 'react';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtext?: string;
  className?: string;
  textClassName?: string;
  onClick?: () => void;
  accentText?: string;
}

const SIZE_MAP = {
  xs: {
    img: 'w-6 h-6',
    text: 'text-sm',
    gap: 'gap-1.5',
    subtext: 'text-[9px]'
  },
  sm: {
    img: 'w-7 h-7 sm:w-8 sm:h-8',
    text: 'text-base sm:text-lg',
    gap: 'gap-2',
    subtext: 'text-[10px]'
  },
  md: {
    img: 'w-8 h-8 sm:w-9 sm:h-9',
    text: 'text-lg sm:text-xl',
    gap: 'gap-2.5',
    subtext: 'text-[11px]'
  },
  lg: {
    img: 'w-10 h-10 sm:w-11 sm:h-11',
    text: 'text-xl sm:text-2xl',
    gap: 'gap-3',
    subtext: 'text-xs'
  },
  xl: {
    img: 'w-14 h-14 sm:w-16 sm:h-16',
    text: 'text-2xl sm:text-3xl',
    gap: 'gap-3.5',
    subtext: 'text-sm'
  }
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtext,
  className = '',
  textClassName = '',
  onClick,
  accentText
}) => {
  const config = SIZE_MAP[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${config.gap} select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Official CounselorPro Green-Style Brand Emblem */}
      <div className={`relative ${config.img} shrink-0 overflow-hidden rounded-xl shadow-xs transition-transform duration-200 hover:scale-105`}>
        <img
          src="/logo.png"
          alt="CounselorPro Logo"
          className="w-full h-full object-contain drop-shadow-xs"
          loading="eager"
          decoding="async"
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-sans font-extrabold tracking-tight text-slate-900 ${config.text} ${textClassName}`}>
              Counselor<span className="text-emerald-600">Pro</span>
            </span>
            {accentText && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                {accentText}
              </span>
            )}
          </div>
          {subtext && (
            <span className={`font-mono font-medium text-slate-500 mt-0.5 tracking-tight ${config.subtext}`}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
