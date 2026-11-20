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
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }[size];

  switch (type) {
    case 'pothole':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Warning Diamond / Rounded Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#EF4444" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#7F1D1D" />
            
            {/* Road Surface Line */}
            <path d="M15 55 L35 55 L40 75 L60 75 L65 55 L85 55" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            
            {/* Car Wheel falling into pothole */}
            <circle cx="50" cy="52" r="14" fill="#F87171" stroke="#FFFFFF" strokeWidth="4" />
            <circle cx="50" cy="52" r="6" fill="#FFFFFF" />
            
            {/* Shock impact waves */}
            <path d="M38 38 L32 30" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
            <path d="M62 38 L68 30" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
            <path d="M50 32 L50 24" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'cattle':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Warning Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#EF4444" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#7F1D1D" />
            
            {/* Indian Cow / Cattle silhouette */}
            <g fill="#FFFFFF">
              {/* Horns */}
              <path d="M32 30 C30 20, 24 18, 20 22 C22 25, 26 28, 30 33 Z" />
              <path d="M68 30 C70 20, 76 18, 80 22 C78 25, 74 28, 70 33 Z" />
              {/* Head */}
              <ellipse cx="50" cy="42" rx="18" ry="16" />
              {/* Muzzle / Snout */}
              <ellipse cx="50" cy="54" rx="14" ry="10" fill="#FCA5A5" />
              <circle cx="44" cy="54" r="2.5" fill="#7F1D1D" />
              <circle cx="56" cy="54" r="2.5" fill="#7F1D1D" />
              {/* Ears */}
              <ellipse cx="26" cy="40" rx="7" ry="4" transform="rotate(-20 26 40)" />
              <ellipse cx="74" cy="40" rx="7" ry="4" transform="rotate(20 74 40)" />
              {/* Body */}
              <rect x="35" y="58" width="30" height="28" rx="6" />
              {/* Legs */}
              <rect x="38" y="78" width="6" height="14" rx="2" />
              <rect x="56" y="78" width="6" height="14" rx="2" />
            </g>
          </svg>
        </div>
      );

    case 'pedestrian':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Amber Warning Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#F59E0B" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#78350F" />
            
            {/* Walking Person Stencil */}
            <g fill="#FFFFFF">
              {/* Head */}
              <circle cx="52" cy="26" r="8" />
              {/* Body */}
              <path d="M48 36 L58 36 L54 58 L46 58 Z" />
              {/* Left arm */}
              <line x1="50" y1="38" x2="38" y2="48" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
              {/* Right arm */}
              <line x1="56" y1="38" x2="66" y2="46" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
              {/* Legs */}
              <line x1="48" y1="56" x2="36" y2="78" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <line x1="53" y1="56" x2="66" y2="78" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            </g>
            {/* Crosswalk Zebra lines */}
            <line x1="22" y1="84" x2="38" y2="84" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
            <line x1="44" y1="84" x2="60" y2="84" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
            <line x1="66" y1="84" x2="82" y2="84" stroke="#FDE68A" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'sharp_curve':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Amber Warning Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#F59E0B" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#78350F" />
            
            {/* Turn Arrow */}
            {turnDirection === 'right' ? (
              <g stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M35 78 L35 52 C35 34, 50 34, 65 34" />
                <path d="M52 22 L68 34 L52 46" strokeWidth="8" fill="none" />
              </g>
            ) : (
              <g stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M65 78 L65 52 C65 34, 50 34, 35 34" />
                <path d="M48 22 L32 34 L48 46" strokeWidth="8" fill="none" />
              </g>
            )}
            
            {/* Safe Speed Badge */}
            <circle cx="72" cy="72" r="14" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
            <text x="72" y="76" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              35
            </text>
          </svg>
        </div>
      );

    case 'fog':
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Purple/Blue Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#8B5CF6" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#4C1D95" />
            
            {/* Headlights & Fog beams */}
            <g stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round">
              <line x1="20" y1="40" x2="80" y2="40" stroke="#C4B5FD" />
              <line x1="30" y1="52" x2="75" y2="52" stroke="#FFFFFF" />
              <line x1="20" y1="64" x2="80" y2="64" stroke="#C4B5FD" />
              <line x1="35" y1="76" x2="65" y2="76" stroke="#FFFFFF" />
            </g>
            {/* Car Silhouette in fog */}
            <path d="M38 32 L44 22 L56 22 L62 32 Z" fill="#DDD6FE" />
          </svg>
        </div>
      );

    case 'safe':
    default:
      return (
        <div className={`relative flex items-center justify-center ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Green Road Shield */}
            <rect x="5" y="5" width="90" height="90" rx="18" fill="#10B981" />
            <rect x="9" y="9" width="82" height="82" rx="14" fill="#064E3B" />
            
            {/* Big Checkmark */}
            <path d="M28 50 L42 66 L72 32" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      );
  }
};
