import React from 'react';
import { SUPPORTED_LANGUAGES } from '@margai/localization';
import {
  ShieldAlert,
  Car,
  FileCheck2,
  Cpu,
  Globe2,
  Sparkles,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

export type TabType = 'command-center' | 'driver' | 'public' | 'civic' | 'google-stack';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  selectedLanguage,
  onSelectLanguage,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#07090F]/90 backdrop-blur-2xl border-b border-[#1E293B] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Buildathon Badge */}
        <div className="flex items-center gap-3.5">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onSelectTab('command-center')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20 group-hover:scale-105 transition-all">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  MargAI
                </span>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 uppercase font-mono">
                  Automotive AI
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#1E293B] text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="font-semibold text-slate-300 text-[11px] tracking-wide font-mono">
              Google Startup Buildathon 2026
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Luxury Floating Pill Navigation */}
        <nav className="flex items-center gap-1.5 bg-[#0C101A] p-1.5 rounded-2xl border border-[#1E293B] shadow-inner">
          {/* Marquee 3-Pane Command Center */}
          <button
            onClick={() => onSelectTab('command-center')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
              currentTab === 'command-center'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-300" />
            <span>3-Pane HUD</span>
          </button>

          <button
            onClick={() => onSelectTab('driver')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'driver'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Car className="w-4 h-4 text-emerald-400" />
            <span>Easy Cockpit</span>
          </button>

          <button
            onClick={() => onSelectTab('civic')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'civic'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Civic Portal</span>
          </button>

          <button
            onClick={() => onSelectTab('google-stack')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'google-stack'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Google Stack</span>
          </button>

          <button
            onClick={() => onSelectTab('public')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'public'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Showcase</span>
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-[#0C101A] border border-[#1E293B] px-3 py-1.5 rounded-xl text-xs shadow-sm hover:border-slate-700 transition-all">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer font-bold text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#0C101A] text-slate-200">
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Cloud Run WebSocket Status */}
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-[#0C101A] border border-[#1E293B] shadow-sm font-mono text-[11px]">
            <Radio
              className={`w-3.5 h-3.5 ${
                isBackendConnected
                  ? 'text-cyan-400 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                  : 'text-amber-400'
              }`}
            />
            <span className="hidden sm:inline text-slate-300">
              {isBackendConnected ? 'Relay · 24ms' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
