import React, { useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
  afterImage = 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=800&q=80',
  beforeLabel = 'BEFORE: D40 Crater (Depth: 7.8cm)',
  afterLabel = 'AFTER: Bitumen Seal (SLA Rectified)',
  className = '',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(rect.width, x));
    setSliderPos((clamped / rect.width) * 100);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className={`relative w-full aspect-[16/10] select-none overflow-hidden rounded-2xl border border-[#1E293B] shadow-2xl cursor-ew-resize bg-[#090D16] ${className}`}
    >
      {/* AFTER IMAGE (Underneath / Full Width) */}
      <img
        src={afterImage}
        alt="After Repair"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* BEFORE IMAGE (Clipped by slider position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeImage}
          alt="Before Repair"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{
            width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%',
          }}
        />
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />
      </div>

      {/* DIVIDER LINE & HANDLE */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] z-20 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center text-cyan-300">
          <MoveHorizontal className="w-4 h-4" />
        </div>
      </div>

      {/* TOP BADGES */}
      <div className="absolute top-3 left-3 z-30 pointer-events-none">
        <span className="px-2.5 py-1 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-[10px] font-bold font-mono shadow-md backdrop-blur-md flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span>{beforeLabel}</span>
        </span>
      </div>

      <div className="absolute top-3 right-3 z-30 pointer-events-none">
        <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold font-mono shadow-md backdrop-blur-md flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{afterLabel}</span>
        </span>
      </div>

      {/* BOTTOM SLA AUDIT PILL */}
      <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
          Drag slider to compare repair
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold backdrop-blur-md">
          SLA: 48h Met (BBMP Ward 85)
        </span>
      </div>
    </div>
  );
};
