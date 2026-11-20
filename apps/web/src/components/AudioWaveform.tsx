import React, { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
  label?: string;
}

const GOOGLE_COLORS = [
  '#4285F4', // Google Blue
  '#EA4335', // Google Red
  '#FBBC05', // Google Yellow
  '#34A853', // Google Green
];

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  barCount = 24,
  className = '',
  label = 'Gemini Live Speech Audio Stream',
}) => {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      setHeights(new Array(barCount).fill(15));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, () => Math.floor(Math.random() * 85) + 15)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, barCount]);

  return (
    <div className={`p-3 rounded-2xl bg-[#090D16]/95 border border-[#1E293B] shadow-inner ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
        <span className="flex items-center gap-1.5 uppercase font-bold text-slate-200">
          <span className="flex items-center gap-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#4285F4] animate-pulse' : 'bg-slate-600'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#EA4335] animate-pulse' : 'bg-slate-600'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#FBBC05] animate-pulse' : 'bg-slate-600'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#34A853] animate-pulse' : 'bg-slate-600'}`}></span>
          </span>
          <span className="ml-1 tracking-wider">{label}</span>
        </span>
        <span className="text-slate-400 font-mono text-[10px]">
          {isActive ? 'GEMINI LIVE 48kHz' : 'STANDBY'}
        </span>
      </div>

      <div className="flex items-end justify-between gap-1 h-10 px-1">
        {heights.map((h, i) => {
          const color = GOOGLE_COLORS[i % GOOGLE_COLORS.length];
          return (
            <div
              key={i}
              className="w-full rounded-full transition-all duration-100"
              style={{
                height: `${h}%`,
                backgroundColor: isActive ? color : '#1E293B',
                boxShadow: isActive ? `0 0 8px ${color}66` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
