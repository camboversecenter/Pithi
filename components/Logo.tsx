import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  variant?: 'icon' | 'full' | 'full-vertical';
  withBackground?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  variant = 'icon',
  withBackground = false,
}) => {
  // Dimensions map
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-10 h-10', // Enhanced to 40px for beautiful legibility of the "DEVA PITHI" mark inside the tile
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    custom: '',
  };

  const containerClasses = `${sizeMap[size] || ''} ${className} flex items-center justify-center`;

  // SVG emblem
  const renderEmblem = () => (
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full transition-transform duration-500 hover:scale-105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Rich Golden Metallic Gradient */}
        <linearGradient id="goldGradient" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DFAD4B" />
          <stop offset="25%" stopColor="#FFF1C2" />
          <stop offset="45%" stopColor="#C9932E" />
          <stop offset="70%" stopColor="#966113" />
          <stop offset="90%" stopColor="#E9C37A" />
          <stop offset="100%" stopColor="#784400" />
        </linearGradient>

        {/* Traditional Khmer Gold Accent Gradient */}
        <linearGradient id="kbachGold" x1="40" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF4D0" />
          <stop offset="50%" stopColor="#D59B2E" />
          <stop offset="100%" stopColor="#6C4200" />
        </linearGradient>

        {/* Elegant Deep Teal & Ocean Blue */}
        <linearGradient id="tealGradient" x1="50" y1="30" x2="110" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2D6F8C" />
          <stop offset="50%" stopColor="#1B475E" />
          <stop offset="100%" stopColor="#0F2B3B" />
        </linearGradient>

        {/* Drop Shadow for overlay depth */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.25" />
        </filter>
        
        <filter id="motifShadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#402300" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* BACKGROUND SHADOW GLOW */}
      <circle cx="60" cy="60" r="50" fill="#2E1C0A" fillOpacity="0.02" />

      {/* TEAL BLUE CONCENTRIC "P" RINGS */}
      <g filter="url(#logoShadow)">
        {/* Outer Circular Arch of "P" */}
        <path
          d="M60,40 C75,40 85,50 85,65 C85,80 72,92 58,95 L53,103 L47,94 M53,103 L45,90"
          stroke="url(#tealGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Concentric Inner Arc of "P" */}
        <path
          d="M60,48 C70,48 77,55 77,65 C77,75 68,84 57,86"
          stroke="url(#tealGradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Dark core line separator to emphasize the parallel ring look */}
        <path
          d="M60,44 C72,44 81,53 81,65 C81,77 70,88 57.5,90.5"
          stroke="#071926"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
      </g>

      {/* BASE GOLD LAYER SHIELD (Geometric V-anchor pointing down) */}
      <path
        d="M38,55 L58,98 L78,55 L68,55 L58,82 L48,55 Z"
        fill="url(#goldGradient)"
        filter="url(#logoShadow)"
      />

      {/* CONCENTRIC V GOLD SHADOW / INNER LAYER */}
      <path
        d="M44,55 L58,85 L72,55"
        stroke="#472A01"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* THE MAJESTIC TRADITIONAL KHMER KBACH FLAME MOTIF (Upper Left to Center) */}
      <g filter="url(#motifShadow)">
        {/* Ornate Lotus / Flame base on the Left */}
        <path
          d="M40,65 C32,65 24,58 28,48 C30,44 35,42 40,46 C44,50 43,58 40,65 Z"
          fill="url(#kbachGold)"
          stroke="url(#goldGradient)"
          strokeWidth="1"
        />
        {/* Concentric Lotus Petal detail */}
        <path
          d="M39,61 C35,61 31,56 34,50 C36,47 40,47 41,51 C42,54 41,58 39,61 Z"
          fill="#5C3B00"
          fillOpacity="0.2"
        />
        <circle cx="37" cy="55" r="4.5" fill="url(#goldGradient)" />

        {/* Khmer Ornate Scroll Sprout */}
        <path
          d="M33,52 C27,45 28,34 37,30 C45,26 50,34 46,42 C44,46 39,47 37,44 C35,41 38,37 41,37 C43,37 44.5,40 42,43 C39,46 35,44 35,41"
          fill="none"
          stroke="url(#kbachGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Rising Graceful Central Flame */}
        <path
          d="M58,90 C50,80 43,72 45,60 C47,48 57,42 55,25 C54,18 48,15 48,8 C53,8 57,14 59,21 C62.5,31 59,38 65,46 C70,52 68,58 63,70 C59,79 61,85 58,90 Z"
          fill="url(#kbachGold)"
          stroke="url(#goldGradient)"
          strokeWidth="1"
        />

        {/* Twin Symmetrical/Echoing Flame Crown Arc behind/above */}
        <path
          d="M58,40 C63,30 65,22 61,12 C67,16 71,24 67,34 C64,41 64.5,45 61,50 M56,30 C60,23 61.5,17 59.5,10 C63,14 65,19 63,26"
          stroke="url(#kbachGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Detailed Ornate Filigree / Incisions inside the main golden flame */}
        <path
          d="M54,48 C52,56 48,62 48,68 C48,74 53,78 55,83"
          stroke="#5C3B00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        <path
          d="M57,35 C57,43 54,47 53,52"
          stroke="#472A01"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
      </g>
    </svg>
  );

  // A helper to render the beautiful beige/cream tile box containing the emblem and the "DEVA PITHI" name below it
  const renderSvgFallback = () => {
    const isTiny = size === 'xs';
    return (
      <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-[#faf4e8] via-[#Fbf6ec] to-[#decdae] w-full h-full">
        {/* Soft elegant vignette / inner radial shadow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_65%,rgba(0,0,0,0.02))] pointer-events-none" />
        
        {/* Emblem scale constraint */}
        <div className={`${isTiny ? 'w-[90%] h-[90%]' : 'w-[70%] h-[70%]'} flex items-center justify-center`}>
          {renderEmblem()}
        </div>
        
        {/* Underlay brand text inside the tile - hide if too tiny */}
        {!isTiny && (
          <div className="flex flex-col items-center leading-none mt-0.5 select-none text-center w-full px-1">
            <span 
              className="text-[6.5px] font-black tracking-[0.14em] text-[#715222] uppercase"
              style={{ fontFamily: "'Libre Baskerville', serif, system-ui" }}
            >
              DEVA
            </span>
            <span 
              className="text-[4px] font-extrabold tracking-[0.1em] text-[#8e6e3c] uppercase flex items-center justify-center gap-[3px] w-full mt-[1px]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className="h-[0.5px] w-1.5 bg-[#8e6e3c]/35"></span>
              PITHI
              <span className="h-[0.5px] w-1.5 bg-[#8e6e3c]/35"></span>
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderTile = () => {
    return (
      <div className="relative overflow-hidden w-full h-full rounded-lg bg-[#f0e6d2] border border-[#cfbe9d] shadow-[0_2px_8px_rgba(80,50,15,0.06)] transition-transform duration-500 hover:scale-105 flex items-center justify-center">
        <img 
          src="https://fioumbuhowumfjptjzfy.supabase.co/storage/v1/object/public/logo/maskable_icon_x512.png" 
          alt="Deva Pithi" 
          className="w-full h-full object-cover block"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // SVG Fallback if image fails to load (e.g. static assets building path changes)
            e.currentTarget.style.display = 'none';
            const fallbackElem = document.getElementById(`logo-fallback-${size}`);
            if (fallbackElem) {
              fallbackElem.style.display = 'block';
            }
          }}
        />
        {/* SVG Fallback Container */}
        <div id={`logo-fallback-${size}`} style={{ display: 'none' }} className="w-full h-full absolute inset-0">
          {renderSvgFallback()}
        </div>
      </div>
    );
  };

  // If full brand layout is requested (horizontal layout with text)
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={sizeMap[size] || 'w-10 h-10'}>
          {renderTile()}
        </div>
        <span 
          className="font-bold text-xl tracking-[0.08em] text-slate-900 select-none"
          style={{ fontFamily: "'Libre Baskerville', serif" }}
        >
          PITHI
        </span>
      </div>
    );
  }

  // If vertical/stacked brand layout is requested (ideal for landing pages/splashes)
  if (variant === 'full-vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {/* Embrossed Backdrop Container if requested */}
        <div className={`p-4 ${withBackground ? 'bg-amber-50/40 backdrop-blur-sm border border-amber-100/60 rounded-3xl shadow-xl shadow-amber-900/5 mb-4' : 'mb-3'}`}>
          <div className={sizeMap[size] || 'w-24 h-24'}>
            {renderTile()}
          </div>
        </div>
        <div className="space-y-1 select-none">
          <h1 
            className="text-4xl font-extrabold tracking-[0.12em] text-slate-900 leading-none"
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            DEVA PITHI
          </h1>
          <div className="h-[2px] w-12 bg-amber-500 mx-auto my-1.5 opacity-80 rounded-full"></div>
          <p className="text-amber-700 text-[10px] font-black tracking-[0.35em] uppercase">
            CEREMONY PLATFORM • ពិធីកម្មវិធីមង្គល
          </p>
        </div>
      </div>
    );
  }

  // Default is just icon variant containing the beautiful tile
  return (
    <div className={containerClasses}>
      {renderTile()}
    </div>
  );
};
