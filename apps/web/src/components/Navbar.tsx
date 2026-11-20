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
    <header className="sticky top-0 z-50 bg-[#07090F] border-b border-[#1E293B] px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onSelectTab('command-center')}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">MargAI</span>
              <span className="text-[10px] font-mono text-slate-400 border border-[#1E293B] px-1.5 py-0.5 rounded">
                v1.0
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#1E293B] text-xs font-mono text-slate-400">
            <span>Google Cloud Run WebSocket Relay</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#090D16] p-1 rounded-xl border border-[#1E293B] text-xs font-mono">
          <button
            onClick={() => onSelectTab('command-center')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'command-center'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>3-Pane HUD</span>
          </button>

          <button
            onClick={() => onSelectTab('driver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'driver'
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Driver View</span>
          </button>

          <button
            onClick={() => onSelectTab('civic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'civic'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Civic Cases</span>
          </button>

          <button
            onClick={() => onSelectTab('google-stack')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'google-stack'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Cloud Stack</span>
          </button>

          <button
            onClick={() => onSelectTab('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentTab === 'public'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Overview</span>
          </button>
        </nav>

        {/* Right side: Language & Health */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#090D16] border border-[#1E293B] px-2.5 py-1 rounded-lg text-xs font-mono">
            <Globe2 className="w-3 h-3 text-cyan-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#090D16] text-slate-200">
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#090D16] border border-[#1E293B] font-mono text-slate-400">
            <Radio
              className={`w-3 h-3 ${isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}`}
            />
            <span className="hidden sm:inline text-[11px]">
              {isBackendConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
