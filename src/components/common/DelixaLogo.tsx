import React, { useState } from 'react';

export const DELIXA_LOGO_URL = 'https://blogger.googleusercontent.com/img/a/AVvXsEjrxecmAszgGtv7v5bnQpsl45_GYvHMpsEcIoxIp2xkGi7UB8zjhWJ9YDQoi9gJrZYcWL65h6HBPUoD2_WHwy6ZMiY65ZK8gSYQ5ZAc6nrpl5EoX9uiaQI5nb66ALs1II9TJkxUWw57ge7uQne0dUf6hB26YFjl74IVnHMVZGUxDCTd9OyVvqW2cwL38EAz';

interface DelixaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'full' | 'image-only' | 'compact';
  theme?: 'light' | 'dark' | 'auto';
  showTagline?: boolean;
  taglineText?: string;
  badgeText?: string;
  className?: string;
  onClick?: () => void;
}

export const DelixaLogo: React.FC<DelixaLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  showTagline = false,
  taglineText = 'Shipping Operations & Last-Mile Delivery',
  badgeText,
  className = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Height configurations per size
  const sizeConfig = {
    xs: {
      imgHeight: 'h-6',
      imgWidth: 'w-auto max-h-6',
      titleSize: 'text-sm font-extrabold',
      taglineSize: 'text-[9px]',
      badgeSize: 'text-[9px] px-1 py-0.2',
      gap: 'gap-1.5',
    },
    sm: {
      imgHeight: 'h-8',
      imgWidth: 'w-auto max-h-8',
      titleSize: 'text-base font-extrabold',
      taglineSize: 'text-[10px]',
      badgeSize: 'text-[10px] px-1.5 py-0.5',
      gap: 'gap-2',
    },
    md: {
      imgHeight: 'h-10',
      imgWidth: 'w-auto max-h-10',
      titleSize: 'text-xl font-black',
      taglineSize: 'text-[11px]',
      badgeSize: 'text-[10px] px-2 py-0.5',
      gap: 'gap-2.5',
    },
    lg: {
      imgHeight: 'h-14',
      imgWidth: 'w-auto max-h-14',
      titleSize: 'text-2xl font-black',
      taglineSize: 'text-xs',
      badgeSize: 'text-xs px-2.5 py-0.5',
      gap: 'gap-3',
    },
    xl: {
      imgHeight: 'h-20',
      imgWidth: 'w-auto max-h-20',
      titleSize: 'text-3xl font-black',
      taglineSize: 'text-sm',
      badgeSize: 'text-xs px-3 py-1',
      gap: 'gap-3.5',
    },
    hero: {
      imgHeight: 'h-24 sm:h-28',
      imgWidth: 'w-auto max-h-28',
      titleSize: 'text-4xl sm:text-5xl font-black',
      taglineSize: 'text-sm sm:text-base',
      badgeSize: 'text-sm px-3.5 py-1',
      gap: 'gap-4',
    },
  }[size];

  const isDarkTheme = theme === 'dark';

  const textColor = isDarkTheme ? 'text-white' : 'text-slate-900';
  const subtextColor = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const badgeClass = isDarkTheme
    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    : 'bg-blue-50 text-blue-700 border-blue-200/80';

  return (
    <div
      id="delixa-official-logo"
      onClick={onClick}
      className={`inline-flex items-center select-none ${sizeConfig.gap} ${onClick ? 'cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]' : ''} ${className}`}
      dir="ltr"
    >
      {/* Official DELIXA Logo Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        {!imgError ? (
          <img
            src={DELIXA_LOGO_URL}
            alt="DELIXA Logo"
            className={`${sizeConfig.imgHeight} ${sizeConfig.imgWidth} object-contain rounded-lg drop-shadow-sm`}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            loading="eager"
          />
        ) : (
          /* High-fidelity Vector Fallback if offline/network blocked */
          <div
            className={`${sizeConfig.imgHeight} aspect-square rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md font-black`}
          >
            <span className="tracking-tighter">D</span>
          </div>
        )}
      </div>

      {/* Typography & Badge if variant is 'full' */}
      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className={`tracking-tight ${sizeConfig.titleSize} ${textColor}`}>
              DELIXA
            </span>
            {badgeText && (
              <span className={`uppercase font-bold tracking-wider rounded-md border ${sizeConfig.badgeSize} ${badgeClass}`}>
                {badgeText}
              </span>
            )}
          </div>
          {showTagline && (
            <span className={`font-medium ${sizeConfig.taglineSize} ${subtextColor} truncate`}>
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
