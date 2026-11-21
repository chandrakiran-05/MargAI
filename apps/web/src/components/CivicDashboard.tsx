import React, { useState, useEffect } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText,
  Clock,
  MapPin,
  Camera,
  Activity,
  Layers,
  Check,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CivicCase } from '@margai/contracts';
import { apiClient } from '../services/apiClient';

export const CivicDashboard: React.FC = () => {
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedCluster, setSelectedCluster] = useState<number>(33);
  const [ticketStatus, setTicketStatus] = useState<'Resolved' | 'In Progress'>('Resolved');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedCase) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.generateGeminiReport(selectedCase.id);
      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              formalComplaintMarkdown: res.markdownReport,
              geminiReportSummary: res.suggestedAction,
              status: prev.status === 'detected' ? 'prepared' : prev.status,
            }
          : null
      );
      await loadCases();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDispatchAuthority = async () => {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.submitToAuthority(selectedCase.id);
      if (res.case) {
        setSelectedCase(res.case);
      }
      await loadCases();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* BROWSER WINDOW FRAME (Matching Slide 6.3 & Slide 10.4: CIVIC QUEUE & REVIEW) */}
      <div className="w-full bg-[#0d111a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Mock Browser Header & URL Bar */}
        <div className="h-10 bg-[#090d16] border-b border-[#1e293b] px-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]/80"></span>
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80"></span>
              <span className="w-3 h-3 rounded-full bg-[#22c55e]/80"></span>
            </div>
            <span className="ml-3 font-bold text-white text-xs">
              CIVIC QUEUE &amp; REVIEW
            </span>
          </div>

          <div className="hidden sm:flex items-center bg-[#131926] border border-[#1e293b] rounded-lg px-3 py-1 text-[11px] text-slate-300 w-72 justify-center">
            <span>civic.dashboard.com/queue</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px]">SLA: 48h IRC Audit</span>
            <button
              onClick={loadCases}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title="Refresh Queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* THREE-COLUMN DASHBOARD GRID (Slide 6.3 & Slide 10.4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-[#1e293b]">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN (3/12): CORRIDOR RISK MAP & AUDIT HISTORY */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 bg-[#0a0e17] border-r border-[#1e293b] p-3.5 sm:p-4 flex flex-col justify-between space-y-4 font-mono">
            <div>
              {/* Header */}
              <div className="pb-3 border-b border-white/[0.08]">
                <div className="text-[10px] text-[#38bdf8] font-bold tracking-wider uppercase">
                  CORRIDOR RISK MAP
                </div>
                <div className="text-sm font-bold text-white">
                  Tracking active hazards
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-2 my-3">
                <div className="bg-[#121824] border border-[#1e293b] rounded-xl p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">Active Hazards</div>
                  <div className="text-xl font-black text-white mt-0.5">423</div>
                </div>

                <div className="bg-[#121824] border border-[#1e293b] rounded-xl p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">Peak in 1 hour</div>
                  <div className="text-xl font-black text-[#f59e0b] mt-0.5">48</div>
                </div>
              </div>

              {/* Hazard Category Selector */}
              <div className="my-2.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">
                  HAZARDS MARKERS
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#141b2a] border border-[#38bdf8]/30 text-white text-xs font-semibold flex items-center justify-between">
                  <span>Potholes (Tamil Nadu)</span>
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping"></span>
                </div>
              </div>

              {/* Checklist Toggles (Slide 10.4) */}
              <div className="space-y-1.5 my-3 text-xs text-slate-300 font-sans">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Deduplicated map</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>Geocached markers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span>V2V / Civic enabled</span>
                </div>
              </div>
            </div>

            {/* AUDIT HISTORY (Slide 10.4) */}
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                AUDIT HISTORY
              </div>
              <div className="space-y-2 text-[11px] text-slate-400 font-mono">
                <div className="p-2 rounded-lg bg-[#101520] border border-white/[0.04]">
                  <div className="text-slate-200 font-bold">Old History • 10 min ago</div>
                  <div className="text-[10px] text-slate-400">Outer Ring Rd · 33 passes merged</div>
                </div>

                <div className="p-2 rounded-lg bg-[#101520] border border-white/[0.04]">
                  <div className="text-slate-200 font-bold">Old History • 18 min ago</div>
                  <div className="text-[10px] text-slate-400">Hosur Rd · Case #4002 dispatched</div>
                </div>

                <div className="p-2 rounded-lg bg-[#101520] border border-white/[0.04]">
                  <div className="text-slate-200 font-bold">Old History • 30 min ago</div>
                  <div className="text-[10px] text-slate-400">Old Airport Rd · 12 sightings verified</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* CENTER COLUMN (5/12): CORRIDOR RISK MAP & CLUSTERS */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 bg-[#0b0e16] relative min-h-[380px] flex flex-col justify-between overflow-hidden border-r border-[#1e293b]">
            
            {/* Top Corridor Map Banner */}
            <div className="p-3 z-10 flex items-center justify-between pointer-events-none">
              <span className="text-xs font-mono font-bold text-slate-300 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-md">
                Tracking Corridor: NH-44 &amp; Ring Road
              </span>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active Sensing</span>
              </div>
            </div>

            {/* Interactive Vector GIS Risk Map SVG */}
            <div className="relative flex-1 w-full h-full">
              <svg viewBox="0 0 600 480" className="absolute inset-0 w-full h-full">
                {/* Dark Base */}
                <rect width="600" height="480" fill="#0d111a" />

                {/* Road Network Grid */}
                <path
                  d="M0 120 L600 120 M0 240 L600 240 M0 360 L600 360"
                  stroke="#171e2c"
                  strokeWidth="3"
                />
                <path
                  d="M100 0 L100 480 M260 0 L260 480 M420 0 L420 480"
                  stroke="#171e2c"
                  strokeWidth="3"
                />

                {/* Diagonal Highways */}
                <path
                  d="M40 440 L220 280 L380 180 L560 60"
                  stroke="#222c3f"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M80 60 L220 280 L480 380"
                  stroke="#222c3f"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Orange/Red Risk Polyline on Corridor */}
                <path
                  d="M120 370 L220 280 L380 180 L480 120"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* CLUSTERED GOLDEN CIRCULAR HAZARD MARKERS (Slide 10.4 & 6.3) */}
                {/* Cluster 1: 33 */}
                <g
                  transform="translate(220, 280)"
                  className="cursor-pointer"
                  onClick={() => setSelectedCluster(33)}
                >
                  <circle r="26" fill="#f59e0b" opacity="0.25" className="animate-ping" />
                  <circle r="18" fill="#d97706" stroke="#ffffff" strokeWidth="2.5" />
                  <text y="5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#ffffff" fontFamily="monospace">
                    33
                  </text>
                </g>

                {/* Cluster 2: 12 */}
                <g
                  transform="translate(380, 180)"
                  className="cursor-pointer"
                  onClick={() => setSelectedCluster(12)}
                >
                  <circle r="20" fill="#f59e0b" opacity="0.25" className="animate-ping" />
                  <circle r="15" fill="#d97706" stroke="#ffffff" strokeWidth="2" />
                  <text y="4" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff" fontFamily="monospace">
                    12
                  </text>
                </g>

                {/* Cluster 3: 8 */}
                <g
                  transform="translate(160, 340)"
                  className="cursor-pointer"
                  onClick={() => setSelectedCluster(8)}
                >
                  <circle r="14" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                  <text y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="monospace">
                    8
                  </text>
                </g>

                {/* Cluster 4: 24 */}
                <g
                  transform="translate(460, 130)"
                  className="cursor-pointer"
                  onClick={() => setSelectedCluster(24)}
                >
                  <circle r="16" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                  <text y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="monospace">
                    24
                  </text>
                </g>

                {/* Cluster 5: 15 */}
                <g
                  transform="translate(300, 240)"
                  className="cursor-pointer"
                  onClick={() => setSelectedCluster(15)}
                >
                  <circle r="15" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                  <text y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff" fontFamily="monospace">
                    15
                  </text>
                </g>
              </svg>

              {/* Map Floating Indicator */}
              <div className="absolute bottom-3 left-3 bg-[#0d1322]/90 border border-white/10 px-3 py-1 rounded-lg text-[10px] font-mono text-slate-300">
                Selected Cluster: <strong>{selectedCluster} potholes</strong> on Outer Ring Corridor
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN (4/12): DEDUPLICATED SIGHTINGS & REPAIR TICKET */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 bg-[#0a0e17] p-3.5 sm:p-4 space-y-3.5 font-mono">
            
            {/* Deduplicated Sightings Table (Slide 6.3) */}
            <div className="bg-[#101522] border border-[#1e293b] rounded-xl p-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Deduplicated Sightings</span>
                <span className="text-[9px] text-[#38bdf8]">Road-Locked</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141b2a] border border-white/[0.04]">
                  <div>
                    <div className="font-bold text-white text-[11px]">Pothole Counts</div>
                    <div className="text-[10px] text-slate-400">33 potholes corridor</div>
                  </div>
                  <span className="text-sm font-extrabold text-[#38bdf8]">100</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141b2a] border border-white/[0.04]">
                  <div>
                    <div className="font-bold text-white text-[11px]">Pothole Counts</div>
                    <div className="text-[10px] text-slate-400">22 potholes corridor</div>
                  </div>
                  <span className="text-sm font-extrabold text-[#38bdf8]">15</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141b2a] border border-white/[0.04]">
                  <div>
                    <div className="font-bold text-white text-[11px]">Pothole Counts</div>
                    <div className="text-[10px] text-slate-400">12 potholes corridor</div>
                  </div>
                  <span className="text-sm font-extrabold text-[#38bdf8]">5</span>
                </div>
              </div>
            </div>

            {/* VERIFIED MUNICIPAL REPAIR TICKET #4002 / #2048 (Slide 6.3 & 10.4) */}
            <div className="bg-[#101522] border border-[#1e293b] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#22c55e] font-bold uppercase tracking-wider">
                    VERIFIED MUNICIPAL REPAIR TICKET #4002
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Proof status: Before/After
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  IRC Passed
                </span>
              </div>

              {/* BEFORE & AFTER PHOTO COMPARISON (Slide 6.3 & Slide 10.4) */}
              <div className="grid grid-cols-2 gap-2 items-center bg-[#070a10] p-2 rounded-lg border border-white/[0.06]">
                {/* Before Photo */}
                <div className="relative aspect-video rounded-lg overflow-hidden border border-red-500/30">
                  <img
                    src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400&q=80"
                    alt="Pothole Before Repair"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.2 rounded text-[8px] text-red-400 font-bold uppercase">
                    Before
                  </span>
                </div>

                {/* After Photo (Cleanly Repaired Asphalt) */}
                <div className="relative aspect-video rounded-lg overflow-hidden border border-emerald-500/30">
                  <img
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80"
                    alt="Asphalt Road After Repair"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.2 rounded text-[8px] text-emerald-400 font-bold uppercase">
                    After
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center font-mono">
                12 sightings merging to Case #4002
              </div>

              {/* Action Buttons: Resolved (Green) | Status (Amber) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setTicketStatus('Resolved')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    ticketStatus === 'Resolved'
                      ? 'bg-[#22c55e] text-black shadow-lg shadow-green-500/20'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </button>

                <button
                  onClick={() => handleGenerateReport()}
                  className="py-2 rounded-xl bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] border border-[#f59e0b]/40 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Status</span>
                </button>
              </div>

              {/* Dispatch Action */}
              <button
                onClick={handleDispatchAuthority}
                disabled={isSubmitting}
                className="w-full py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Dispatching...' : 'Dispatch to BBMP / NHAI'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
