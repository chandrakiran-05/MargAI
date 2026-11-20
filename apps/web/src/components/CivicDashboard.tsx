import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Send,
  FileText,
  Clock,
  MapPin,
  Camera,
  Activity,
} from 'lucide-react';
import { CivicCase } from '@margai/contracts';
import { apiClient } from '../services/apiClient';

export const CivicDashboard: React.FC = () => {
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

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

  const filteredCases = cases.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0D1322] border border-[#1E293B] mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4285F4] mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>MUNICIPAL DEFECT REGISTRY · BBMP / NHAI · GOVTECH</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Road Hazard Evidence & Maintenance Dispatch
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            IRC:SP:84-2019 road maintenance standards compliance and 48-hour rectification audit.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-right hidden sm:block">
            <div className="text-slate-400 text-[10px]">REPAIR SLA</div>
            <div className="text-[#34A853] font-bold">48 Hours (Bituminous Seal)</div>
          </div>
          <button
            onClick={loadCases}
            className="px-3.5 py-1.5 rounded-lg bg-[#090D16] hover:bg-slate-800 text-slate-200 border border-[#1E293B] transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* 4 Google-Color Key Metrics (From Buildathon Problem Statement) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 font-mono">
        {/* Card 1: Google Red */}
        <div className="p-3.5 rounded-xl bg-[#EA4335]/10 border border-[#EA4335]/30 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#EA4335]">Critical Impact</div>
          <div className="text-xl font-bold text-white">1.77L+ Fatalities</div>
          <div className="text-[10px] text-slate-400 font-sans">Preventable road hazards</div>
        </div>

        {/* Card 2: Google Yellow */}
        <div className="p-3.5 rounded-xl bg-[#FBBC05]/10 border border-[#FBBC05]/30 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#FBBC05]">Economic Drain</div>
          <div className="text-xl font-bold text-white">₹1000s Cr Loss</div>
          <div className="text-[10px] text-slate-400 font-sans">Commercial fleet damage</div>
        </div>

        {/* Card 3: Google Blue */}
        <div className="p-3.5 rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/30 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#4285F4]">Roads API Sync</div>
          <div className="text-xl font-bold text-white">road_placeId</div>
          <div className="text-[10px] text-slate-400 font-sans">Road-locked deduplication</div>
        </div>

        {/* Card 4: Google Green */}
        <div className="p-3.5 rounded-xl bg-[#34A853]/10 border border-[#34A853]/30 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#34A853]">Contractor SLA</div>
          <div className="text-xl font-bold text-white">48h SLA Audit</div>
          <div className="text-[10px] text-slate-400 font-sans">Zero duplicate complaints</div>
        </div>
      </div>

      {/* Main 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cases List */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#0D1322] border border-[#1E293B]">
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs font-mono">
              {['all', 'detected', 'corroborated', 'prepared', 'submitted'].map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-mono text-[11px] transition-all ${
                    activeFilter === st
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCase?.id === c.id
                      ? 'bg-[#121B30] border-cyan-500/60'
                      : 'bg-[#090D16] border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs capitalize flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{c.hazardType}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                        c.status === 'submitted'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : c.status === 'corroborated'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-200 truncate mb-1">
                    {c.roadName}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1.5 border-t border-white/[0.05]">
                    <span>Severity: <strong>{c.severityScore}/10</strong></span>
                    <span>{c.evidenceCount} passes</span>
                  </div>

                  {c.authority.complaintNumber && (
                    <div className="mt-1.5 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      Ref: {c.authority.complaintNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case Details & Report */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCase ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0D1322] border border-[#1E293B] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                      Case #{selectedCase.id}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#090D16] text-slate-300 border border-[#1E293B]">
                      {selectedCase.jurisdiction}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {selectedCase.roadName}
                  </h2>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {selectedCase.status !== 'submitted' ? (
                    <>
                      <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 transition-all disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isGenerating ? 'Drafting...' : 'Draft Notice (IRC)'}</span>
                      </button>

                      <button
                        onClick={handleDispatchAuthority}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Dispatching...' : 'Dispatch to BBMP'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acknowledged: {selectedCase.authority.complaintNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos & Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-[#1E293B] bg-black">
                  <div className="p-2 bg-[#090D16] border-b border-[#1E293B] text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span>Optical Frame</span>
                    <span className="text-[10px] text-slate-400">CameraX + LiteRT</span>
                  </div>
                  <img
                    src={selectedCase.evidenceUrls[0]}
                    alt="Defect"
                    className="w-full h-44 object-cover"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#090D16] border border-[#1E293B] text-xs space-y-2 font-mono">
                  <div className="text-slate-400 uppercase text-[10px] pb-1 border-b border-white/[0.06]">
                    Defect Audit Telemetry
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="text-white">
                      {selectedCase.location.latitude.toFixed(6)}, {selectedCase.location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GPS Accuracy:</span>
                    <span className="text-emerald-400">±{selectedCase.location.horizontalAccuracyM || 1.5}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Independent Passes:</span>
                    <span className="text-blue-400">{selectedCase.evidenceCount} vehicles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accelerometer Peak:</span>
                    <span className="text-amber-400">2.1G</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Depth Class:</span>
                    <span className="text-rose-400">7.5 cm (D40)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authority:</span>
                    <span className="text-slate-200">{selectedCase.authority.name}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Notice */}
              {selectedCase.formalComplaintMarkdown ? (
                <div className="p-4 rounded-xl bg-[#090D16] border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-purple-400 pb-1.5 border-b border-[#1E293B]">
                    <span className="font-bold font-mono">Statutory Notice (IRC:SP:84-2019 Format)</span>
                    <span className="font-mono text-[10px] text-slate-400">Standard SLA: 48h</span>
                  </div>

                  <div className="prose prose-invert prose-sm max-w-none text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto pr-2">
                    {selectedCase.formalComplaintMarkdown}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#090D16] border border-dashed border-[#1E293B] text-center text-xs text-slate-400 font-mono">
                  Click "Draft Notice (IRC)" to generate a formal statutory road notice formatted for municipal engineers.
                </div>
              )}

              {/* Audit Trail */}
              <div className="pt-3 border-t border-[#1E293B]">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Audit Log
                </span>
                <div className="space-y-1 text-[11px] font-mono text-slate-400">
                  {selectedCase.auditTrail.map((at, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-600">[{new Date(at.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-blue-400">{at.action}:</span>
                      <span className="text-slate-300">{at.notes || at.actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-[#0D1322] border border-[#1E293B] text-center text-slate-400 text-xs font-mono">
              Select a case to inspect evidence and review reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
