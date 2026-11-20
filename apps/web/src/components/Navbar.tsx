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
} from 'lucide-react';

export type TabType = 'public' | 'driver' | 'civic' | 'google-stack';

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
    <header className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Buildathon Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('public')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">
                  MargAI
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  मर्ग · Road Safety
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-semibold text-slate-300">Google Startup Buildathon 2026</span>
          </div>
        </div>

        {/* Navigation Tabs - Big, Tactile, High Contrast */}
        <nav className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm">
          <button
            onClick={() => onSelectTab('driver')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              currentTab === 'driver'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4 text-emerald-400" />
            <span>Driver Mode</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
              Easy
            </span>
          </button>

          <button
            onClick={() => onSelectTab('public')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              currentTab === 'public'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => onSelectTab('civic')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              currentTab === 'civic'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Civic Portal</span>
          </button>

          <button
            onClick={() => onSelectTab('google-stack')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
              currentTab === 'google-stack'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Google Stack</span>
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-slate-100 outline-none cursor-pointer font-bold text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Cloud Run WebSocket Status */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Radio
              className={`w-3.5 h-3.5 ${
                isBackendConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
              }`}
            />
            <span className="hidden sm:inline text-slate-300 font-mono text-[11px]">
              {isBackendConnected ? 'Relay: 24ms' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
