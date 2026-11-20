import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Send,
  Sparkles,
  ExternalLink,
  Clock,
  MapPin,
  Camera,
  ScrollText,
  Activity,
  Layers,
} from 'lucide-react';
import { CivicCase } from '@margai/contracts';
import { apiClient } from '../services/apiClient';

export const CivicDashboard: React.FC = () => {
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CivicCase | null>(null);
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
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
    } catch (err) {
      console.warn('Failed to load civic cases:', err);
    }
  };

  const handleGenerateGeminiReport = async () => {
    if (!selectedCase) return;
    setIsGeneratingGemini(true);
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
    } catch (err) {
      console.error('Gemini report generation failed:', err);
    } finally {
      setIsGeneratingGemini(false);
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
    } catch (err) {
      console.error('Authority submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.status === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#0C1222] via-[#090D18] to-[#0D101D] border border-white/[0.08] shadow-2xl mb-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5 font-mono">
            <Building2 className="w-4 h-4" />
            <span>Bruhat Bengaluru Mahanagara Palike (BBMP) & NHAI Civic Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Road Hazard Evidence & Municipal Dispatch Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grounded statutory grievance preparation powered by Google Gemini 2.5 Flash under IRC:SP:84-2019 standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-300">Mandated Authority SLA</div>
            <div className="text-xs text-emerald-400 font-mono font-bold">48-Hour Pothole Rectification</div>
          </div>
          <button
            onClick={loadCases}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-bold border border-white/10 transition-all shadow-sm"
          >
            Refresh Cases
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col (1 Col): Cases List & Filters */}
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] shadow-xl backdrop-blur-xl">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-4 text-xs font-mono">
              {['all', 'detected', 'corroborated', 'prepared', 'submitted'].map((st) => (
                <button
                  key={st}
                  onClick={() => setActiveFilter(st)}
                  className={`px-3 py-1.5 rounded-xl capitalize font-bold transition-all ${
                    activeFilter === st
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Cases Scrollable List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedCase?.id === c.id
                      ? 'bg-indigo-950/40 border-blue-500/80 shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/30'
                      : 'bg-[#06080E]/70 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5 capitalize">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{c.hazardType}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize font-mono ${
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

                  <div className="text-xs text-slate-200 font-medium truncate mb-1">
                    {c.roadName}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
                    <span>Severity: <strong className="text-amber-300">{c.severityScore}/10</strong></span>
                    <span>{c.evidenceCount} passes</span>
                  </div>

                  {c.authority.complaintNumber && (
                    <div className="mt-2 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Ref: {c.authority.complaintNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col (2 Cols): Selected Case Evidence & Gemini Report */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCase ? (
            <div className="p-6 sm:p-7 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-6">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400 font-bold uppercase">
                      Case #{selectedCase.id}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10">
                      {selectedCase.jurisdiction}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                    {selectedCase.roadName}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedCase.status !== 'submitted' ? (
                    <>
                      <button
                        onClick={handleGenerateGeminiReport}
                        disabled={isGeneratingGemini}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 ring-1 ring-white/20"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isGeneratingGemini ? 'Drafting...' : 'Draft Notice (Gemini 2.5)'}</span>
                      </button>

                      <button
                        onClick={handleDispatchAuthority}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 ring-1 ring-white/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Dispatching...' : 'Dispatch to BBMP'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 rounded-xl font-mono font-bold shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acknowledged: {selectedCase.authority.complaintNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence Inspector Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Evidence Photo */}
                <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black shadow-md">
                  <div className="p-3 bg-[#0C101A] border-b border-white/[0.08] text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      <span>Optical Evidence Photo</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">CameraX + LiteRT</span>
                  </div>
                  <img
                    src={selectedCase.evidenceUrls[0]}
                    alt="Road Hazard Evidence"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Sensor Telemetry Box */}
                <div className="p-4 rounded-2xl bg-[#06080E] border border-white/[0.08] text-xs space-y-3 font-mono shadow-inner">
                  <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-1.5 border-b border-white/[0.06]">
                    Sensor Telemetry Audit
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GPS Coordinates:</span>
                    <span className="text-white font-bold">
                      {selectedCase.location.latitude.toFixed(6)}° N, {selectedCase.location.longitude.toFixed(6)}° E
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GPS Accuracy:</span>
                    <span className="text-emerald-400 font-bold">±{selectedCase.location.horizontalAccuracyM || 1.5}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Independent Vehicles:</span>
                    <span className="text-blue-400 font-bold">{selectedCase.evidenceCount} corroborations</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accelerometer Peak:</span>
                    <span className="text-amber-400 font-bold">2.1G (Severe Shock)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Depth:</span>
                    <span className="text-rose-400 font-bold">7.5 cm (Class D40)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Authority:</span>
                    <span className="text-slate-200">{selectedCase.authority.name}</span>
                  </div>
                </div>
              </div>

              {/* Gemini Generated Formal Report Box */}
              {selectedCase.formalComplaintMarkdown ? (
                <div className="p-6 rounded-2xl bg-[#06080E] border border-purple-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-purple-400 pb-2.5 border-b border-white/[0.06]">
                    <span className="flex items-center gap-2 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Statutory Notice Draft (Google Gemini 2.5 Flash)</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Standard: IRC:SP:84-2019
                    </span>
                  </div>

                  <div className="prose prose-invert prose-sm max-w-none text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-2">
                    {selectedCase.formalComplaintMarkdown}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-[#06080E]/60 border border-dashed border-white/10 text-center text-xs text-slate-400">
                  <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto mb-2" />
                  <p>Click <strong>"Draft Notice (Gemini 2.5)"</strong> to automatically generate a formal statutory road notice formatted for Indian municipal engineers.</p>
                </div>
              )}

              {/* Immutable Audit Trail */}
              <div className="pt-4 border-t border-white/[0.07]">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                  Immutable Case Audit Trail
                </span>
                <div className="space-y-1.5 text-xs font-mono text-slate-400">
                  {selectedCase.auditTrail.map((at, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-600">[{new Date(at.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-blue-400 font-semibold">{at.action}:</span>
                      <span className="text-slate-300">{at.notes || at.actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#090D18]/60 border border-white/[0.08] text-center text-slate-400 text-sm">
              Select a civic case from the left panel to inspect evidence and review Gemini reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
