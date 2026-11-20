import React from 'react';

export type HazardIconType = 'pothole' | 'cattle' | 'pedestrian' | 'sharp_curve' | 'fog' | 'safe' | 'incident';

interface HazardPictogramProps {
  type: HazardIconType;
  turnDirection?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const HazardPictogram: React.FC<HazardPictogramProps> = ({
  type,
  turnDirection = 'right',
  size = 'lg',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-18 h-18',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }[size];

  switch (type) {
    case 'pothole':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]">
            <defs>
              <linearGradient id="potholeBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2A0B0E" />
                <stop offset="50%" stopColor="#1A0709" />
                <stop offset="100%" stopColor="#0E0305" />
              </linearGradient>
              <linearGradient id="potholeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F87171" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
              <radialGradient id="potholeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glowing Backdrop */}
            <circle cx="60" cy="60" r="54" fill="url(#potholeGlow)" />

            {/* Premium Hexagonal Vehicle HUD Shield */}
            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#potholeBg)"
              stroke="url(#potholeBorder)"
              strokeWidth="3.5"
            />

            {/* Road Cross-Section with Deep Asphalt Cavity */}
            <path
              d="M22 66 L42 66 C45 66, 46 88, 60 88 C74 88, 75 66, 78 66 L98 66"
              stroke="#FCA5A5"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Cavity Depth Shadow */}
            <path
              d="M44 70 C48 84, 72 84, 76 70"
              stroke="#7F1D1D"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />

            {/* High-Tech Automotive Wheel in Cavity */}
            <circle cx="60" cy="62" r="16" fill="#1C1917" stroke="#F87171" strokeWidth="4.5" />
            <circle cx="60" cy="62" r="8" fill="#EF4444" />
            <circle cx="60" cy="62" r="3" fill="#FFFFFF" />

            {/* Dynamic Hazard Impact Laser Beams */}
            <path d="M46 44 L38 34" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M74 44 L82 34" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M60 36 L60 24" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'cattle':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <defs>
              <linearGradient id="cattleBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#291605" />
                <stop offset="50%" stopColor="#180C03" />
                <stop offset="100%" stopColor="#0B0501" />
              </linearGradient>
              <linearGradient id="cattleBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <radialGradient id="cattleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="60" cy="60" r="54" fill="url(#cattleGlow)" />

            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#cattleBg)"
              stroke="url(#cattleBorder)"
              strokeWidth="3.5"
            />

            {/* Stylized Modern Cattle Silhouette */}
            <g fill="#FDE68A">
              {/* Horns */}
              <path d="M38 36 C34 22, 26 20, 22 24 C25 28, 30 32, 36 38 Z" fill="#FBBF24" />
              <path d="M82 36 C86 22, 94 20, 98 24 C95 28, 90 32, 84 38 Z" fill="#FBBF24" />
              {/* Head */}
              <ellipse cx="60" cy="50" rx="20" ry="17" fill="#FFFBEB" />
              {/* Muzzle */}
              <ellipse cx="60" cy="64" rx="16" ry="11" fill="#FBBF24" />
              <circle cx="53" cy="64" r="3" fill="#451A03" />
              <circle cx="67" cy="64" r="3" fill="#451A03" />
              {/* Eyes */}
              <circle cx="50" cy="46" r="3" fill="#78350F" />
              <circle cx="70" cy="46" r="3" fill="#78350F" />
              {/* Ears */}
              <ellipse cx="34" cy="48" rx="8" ry="4.5" transform="rotate(-20 34 48)" fill="#FDE68A" />
              <ellipse cx="86" cy="48" rx="8" ry="4.5" transform="rotate(20 86 48)" fill="#FDE68A" />
              {/* Body */}
              <rect x="42" y="70" width="36" height="26" rx="8" fill="#FDE68A" />
              <rect x="46" y="90" width="8" height="15" rx="3" fill="#F59E0B" />
              <rect x="66" y="90" width="8" height="15" rx="3" fill="#F59E0B" />
            </g>
          </svg>
        </div>
      );

    case 'sharp_curve':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(139,92,246,0.4)]">
            <defs>
              <linearGradient id="curveBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#200B3B" />
                <stop offset="50%" stopColor="#120624" />
                <stop offset="100%" stopColor="#080212" />
              </linearGradient>
              <linearGradient id="curveBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#6B21A8" />
              </linearGradient>
              <radialGradient id="curveGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="60" cy="60" r="54" fill="url(#curveGlow)" />

            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#curveBg)"
              stroke="url(#curveBorder)"
              strokeWidth="3.5"
            />

            {/* Aerodynamic High-Tech Velocity Curve Arrow */}
            {turnDirection === 'right' ? (
              <g stroke="#E9D5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M42 92 L42 58 C42 40, 56 40, 75 40" />
                <path d="M62 26 L80 40 L62 54" strokeWidth="8" fill="none" />
              </g>
            ) : (
              <g stroke="#E9D5FF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M78 92 L78 58 C78 40, 64 40, 45 40" />
                <path d="M58 26 L40 40 L58 54" strokeWidth="8" fill="none" />
              </g>
            )}

            {/* Glowing Speed Disc */}
            <circle cx="85" cy="85" r="16" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="85" y="90" fill="#FFFFFF" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
              35
            </text>
          </svg>
        </div>
      );

    case 'pedestrian':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <defs>
              <linearGradient id="pedBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#251605" />
                <stop offset="50%" stopColor="#150C03" />
                <stop offset="100%" stopColor="#0A0601" />
              </linearGradient>
              <linearGradient id="pedBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>

            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#pedBg)"
              stroke="url(#pedBorder)"
              strokeWidth="3.5"
            />

            <g fill="#FEF3C7">
              <circle cx="62" cy="30" r="9" />
              <path d="M58 42 L70 42 L65 66 L55 66 Z" />
              <line x1="60" y1="44" x2="46" y2="56" stroke="#FEF3C7" strokeWidth="5.5" strokeLinecap="round" />
              <line x1="68" y1="44" x2="80" y2="54" stroke="#FEF3C7" strokeWidth="5.5" strokeLinecap="round" />
              <line x1="58" y1="64" x2="44" y2="90" stroke="#FEF3C7" strokeWidth="6.5" strokeLinecap="round" />
              <line x1="64" y1="64" x2="78" y2="90" stroke="#FEF3C7" strokeWidth="6.5" strokeLinecap="round" />
            </g>
            <line x1="28" y1="96" x2="46" y2="96" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="52" y1="96" x2="70" y2="96" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="76" y1="96" x2="94" y2="96" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'fog':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(99,102,241,0.4)]">
            <defs>
              <linearGradient id="fogBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#141432" />
                <stop offset="50%" stopColor="#0B0B1D" />
                <stop offset="100%" stopColor="#050510" />
              </linearGradient>
              <linearGradient id="fogBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#3730A3" />
              </linearGradient>
            </defs>

            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#fogBg)"
              stroke="url(#fogBorder)"
              strokeWidth="3.5"
            />

            <g stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round">
              <line x1="26" y1="46" x2="94" y2="46" stroke="#A5B4FC" />
              <line x1="36" y1="60" x2="88" y2="60" stroke="#E0E7FF" />
              <line x1="26" y1="74" x2="94" y2="74" stroke="#A5B4FC" />
              <line x1="42" y1="88" x2="78" y2="88" stroke="#E0E7FF" />
            </g>
          </svg>
        </div>
      );

    case 'safe':
    default:
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_25px_rgba(16,185,129,0.35)]">
            <defs>
              <linearGradient id="safeBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#07271E" />
                <stop offset="50%" stopColor="#041813" />
                <stop offset="100%" stopColor="#020E0A" />
              </linearGradient>
              <linearGradient id="safeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <radialGradient id="safeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="60" cy="60" r="54" fill="url(#safeGlow)" />

            <rect
              x="10"
              y="10"
              width="100"
              height="100"
              rx="28"
              fill="url(#safeBg)"
              stroke="url(#safeBorder)"
              strokeWidth="3.5"
            />

            {/* Glowing Emerald Checkmark */}
            <path
              d="M34 60 L50 78 L86 38"
              stroke="#6EE7B7"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      );
  }
};
