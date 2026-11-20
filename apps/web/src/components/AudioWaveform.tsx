import React, { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
  label?: string;
}

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
    <div className={`p-3 rounded-2xl bg-[#0B101D]/90 border border-[#1E293B] shadow-inner ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
        <span className="flex items-center gap-1.5 uppercase font-bold text-cyan-400">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`}></span>
          <span>{label}</span>
        </span>
        <span className="text-slate-500 font-mono">
          {isActive ? 'STREAMING 48kHz' : 'STANDBY'}
        </span>
      </div>

      <div className="flex items-end justify-between gap-1 h-10 px-1">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`w-full rounded-full transition-all duration-100 ${
              isActive
                ? 'bg-gradient-to-t from-cyan-600 via-cyan-400 to-sky-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                : 'bg-slate-800'
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
};
